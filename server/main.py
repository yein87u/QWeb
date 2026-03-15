import json
from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
import models
from core_algorithm import core_algorithm_v1
from qiskit import QuantumCircuit, qasm2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExperimentData(BaseModel):
    title: str
    quantumN: int
    mappings: List[dict]

@app.post("/optimize")
async def run_optimization(exp: ExperimentData):
    targets = [int(item['target']) for item in exp.mappings]
    
    # 直接將 generator 函式傳入 StreamingResponse
    # media_type 設為 text/event-stream 符合 SSE (Server-Sent Events) 規範
    return StreamingResponse(
        core_algorithm_v1(targets, exp.quantumN), 
        media_type="text/event-stream"
    )

# Dependency: 獲取資料庫 Session
def get_db():
    db = models.SessionLocal()
    try: yield db
    finally: db.close()

@app.post("/experiments")
def create_experiment(exp: ExperimentData, db: Session = Depends(get_db)):
    # 將 mappings 陣列轉換成您要的 TXT/CSV 格式字串
    txt_content = "\n".join([f"{item['input']},{item['target']}" for item in exp.mappings])
    
    new_exp = models.Experiment(
        title=exp.title, 
        quantumN=exp.quantumN,
        input_data=txt_content # 儲存如同 TXT 的格式
    )
    db.add(new_exp)
    db.commit()
    db.refresh(new_exp)
    return new_exp

@app.post("/optimize/{exp_id}")
async def run_optimization(exp_id: int, exp: ExperimentData, db: Session = Depends(get_db)):
    targets = [int(item['target']) for item in exp.mappings]
    
    # 定義一個包裝過的產生器，負責在最後將結果存回資料庫
    async def save_and_stream():
        final_circuit = None
        async for chunk in core_algorithm_v1(targets, exp.quantumN):
            # 解析並記錄最終結果
            if "data: " in chunk:
                data = json.loads(chunk.replace("data: ", ""))
                if "circuit" in data:
                    final_circuit = data["circuit"]
            print("final_circuit: ", final_circuit)
            yield chunk
        
        # 迭代完成後存入 DB
        db_exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
        if db_exp:
            db_exp.circuit_data = json.dumps(final_circuit)
            db.commit()

    return StreamingResponse(save_and_stream(), media_type="text/event-stream")

# 您要求的 CRUD API
@app.get("/experiments")
def get_all(db: Session = Depends(get_db)):
    return db.query(models.Experiment).all()

@app.delete("/experiments")
def delete_all(db: Session = Depends(get_db)):
    db.query(models.Experiment).delete()
    db.commit()
    return {"status": "success"}

@app.get("/experiments/{exp_id}")
def get_experiment_detail(exp_id: int, db: Session = Depends(get_db)):
    # 提取特定實驗的所有數據
    return db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()

@app.delete("/experiments/{experiment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    # 查詢該 ID 的實驗紀錄
    db_experiment = db.query(models.Experiment).filter(models.Experiment.id == experiment_id).first()
    # 如果找不到資料，回傳 404 錯誤
    if not db_experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="找不到該實驗紀錄"
        )
    db.delete(db_experiment)
    db.commit()
    
    return None

@app.put("/experiments/{experiment_id}")
def clear_circuit(experiment_id: int, db: Session = Depends(get_db)):
    db_experiment = db.query(models.Experiment).filter(models.Experiment.id == experiment_id).first()
    if not db_experiment:
        raise HTTPException(status_code=404, detail="實驗不存在")
    
    db_experiment.circuit_data = None 
    db.commit()
    return {"message": "電路資料已清空"}

class ExportRequest(BaseModel):
    circuit: list
    title: str = "circuit"

@app.post("/generate-qasm")
async def generate_qasm(data: ExportRequest):
    try:
        circuit_steps = data.circuit
        if not circuit_steps:
            raise HTTPException(status_code=400, detail="沒有電路數據可供轉換")

        # 取得 Qubit 數量 (n)
        n = len(circuit_steps[0])
        qc = QuantumCircuit(n, n)

        for step in circuit_steps:
            # 1 代表控制位 (Control), 3 代表目標位 (Target/NOT)
            controls = [i for i, val in enumerate(step) if val == 1]
            target = next((i for i, val in enumerate(step) if val == 3), -1)

            if target != -1:
                if len(controls) == 0:
                    qc.x(target)
                elif len(controls) == 1:
                    qc.cx(controls[0], target)
                elif len(controls) == 2:
                    qc.ccx(controls[0], controls[1], target)
                else:
                    qc.mcx(controls, target)
            
            qc.barrier()
        
        qc.measure(range(n), range(n))
        qasm_string = qasm2.dumps(qc)
        
        return {"qasm": qasm_string, "title": data.title}

    except Exception as e:
        print(f"QASM 生成錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/experiment/{experiment_id}")
def update_experiment(experiment_id: int, exp: ExperimentData, db: Session = Depends(get_db)):
    # 1. 查找該實驗是否存在
    db_experiment = db.query(models.Experiment).filter(models.Experiment.id == experiment_id).first()
    
    if not db_experiment:
        raise HTTPException(status_code=404, detail="實驗不存在")
    
    # 2. 更新基本欄位
    db_experiment.title = exp.title
    
    # 檢查 N 是否改變，若改變則清空舊電路 (保持資料一致性)
    if db_experiment.quantumN != exp.quantumN:
        db_experiment.circuit_data = None
    db_experiment.quantumN = exp.quantumN
    
    # 3. 處理 Mappings 並轉換為資料庫儲存格式 (CSV/TXT)
    # 修正重點：直接從 exp.mappings 提取資料，避免 AttributeError
    try:
        txt_content = "\n".join([f"{item['input']},{item['target']}" for item in exp.mappings])
        db_experiment.input_data = txt_content
    except Exception as e:
        print(f"資料轉換錯誤: {e}")
        # 如果傳入的是 Pydantic 物件而非 dict，則嘗試 .get() 或屬性存取
        txt_content = "\n".join([f"{item.get('input')},{item.get('target')}" for item in exp.mappings])
        db_experiment.input_data = txt_content

    # 4. 儲存並刷新資料
    db.commit()
    db.refresh(db_experiment)
    
    # 5. 回傳完整物件給前端
    return db_experiment

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)