# from fastapi import FastAPI
# from app.db.base import Base
# from app.db.session import engine
# from app.api.endpoints import webhooks
# from app.api.endpoints import upload

# # SQLAlchemy가 models.py를 보고 DB에 테이블이 없으면 생성해줍니다.
# Base.metadata.create_all(bind=engine)

# app = FastAPI(
#     title="ORB AI Backend API",
#     description="Supabase 인증과 연동되는 FastAPI 백엔드 서버입니다.",
#     version="0.1.0"
# )

# # webhooks.py에 정의된 모든 API 경로를 우리 앱에 공식적으로 등록합니다.
# app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])

# @app.get("/")
# def read_root():
#     return {"message": "Welcome to the ORB AI Backend!"}

# app.include_router(upload.router)

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split

app = FastAPI()

# CORS 허용 (프론트 주소만 제한하는 게 안전)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 시 ["http://localhost:3001", "https://내도메인.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB 연결
DB_CONFIG = {
    "user": "admin1",
    "password": "yosep1234",
    "host": "ppl-databse.c3mgm880ipe5.ap-northeast-2.rds.amazonaws.com",
    "port": 3306,
    "database": "PPL_Service"
}

engine = create_engine(
    f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@"
    f"{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset=utf8mb4"
)


# -------------------------------
# 기본 분석 정보 조회 (프론트 대시보드에서 호출하는 엔드포인트)
# -------------------------------
@app.get("/api/analysis/{submitNum}")
async def get_analysis(submitNum: str):
    return {
        "submitNum": submitNum,
        "status": "completed",
        "message": f"{submitNum} 분석 데이터가 준비되었습니다."
    }


# -------------------------------
# 예측 그래프 데이터 조회
# -------------------------------
@app.get("/api/analysis/{submitNum}/prediction-chart")
async def get_prediction_chart(submitNum: str, industry: str = "F&B"):
    query = f"""
    SELECT * FROM ppl_dummy_data
    WHERE TRIM(LOWER(industry)) = LOWER('{industry}');
    """
    
    try:
        df = pd.read_sql(query, engine)
        print(f"DEBUG: 조회된 row 수 → {len(df)}")
    except Exception as e:
        return JSONResponse(content={"error": f"데이터베이스 연결 오류: {e}"}, status_code=500)

    if len(df) < 20:
        return JSONResponse(content={"error": f"데이터 부족: {industry}"}, status_code=400)

    # Feature/Target 설정
    features = [
        "num_ppl_scenes", "total_exposure_seconds", "avg_viewer_rating_percent",
        "brand_awareness_pre_percent", "purchase_intent_pre_percent",
        "production_cost_won", "media_cost_won"
    ]
    target_sales = "sales_increase_won"

    X = df[features].fillna(0)
    y_sales = df[target_sales].fillna(0)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_sales, test_size=0.2, random_state=42
    )

    model_sales = XGBRegressor(
        n_estimators=500,
        learning_rate=0.05,
        max_depth=6,
        random_state=42
    )
    model_sales.fit(X_train, y_train)

    # What-if 시뮬레이션
    exposure_range = np.linspace(
        df['total_exposure_seconds'].min(),
        df['total_exposure_seconds'].max(),
        50
    )
    what_if_df = pd.DataFrame({
        'num_ppl_scenes': [df['num_ppl_scenes'].mean()] * len(exposure_range),
        'total_exposure_seconds': exposure_range,
        'avg_viewer_rating_percent': [df['avg_viewer_rating_percent'].mean()] * len(exposure_range),
        'brand_awareness_pre_percent': [df['brand_awareness_pre_percent'].mean()] * len(exposure_range),
        'purchase_intent_pre_percent': [df['purchase_intent_pre_percent'].mean()] * len(exposure_range),
        'production_cost_won': [df['production_cost_won'].mean()] * len(exposure_range),
        'media_cost_won': [df['media_cost_won'].mean()] * len(exposure_range)
    })

    predicted_sales = model_sales.predict(what_if_df)

    return {
        "labels": [float(f'{e:.2f}') for e in exposure_range],
        "values": [float(f'{s:.2f}') for s in predicted_sales]
    }
