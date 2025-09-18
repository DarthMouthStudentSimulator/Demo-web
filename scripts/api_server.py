from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from google.genai import types
from google import genai

import pandas as pd
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# from dotenv import load_dotenv


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]

# load_dotenv()  
# api_key = os.getenv("GEMINI_API_KEY")
# client = genai.Client(api_key = api_key)


class ChatRequest(BaseModel):
    message: str
    apiKey: Optional[str] = None
    studentId: str
    bigFive: Dict[str, int]
    weeklyDesc: str
    week: int


def _user_dir(user_id: str) -> Path:
    return WORKSPACE_ROOT / user_id


def _ensure_user(user_id: str) -> None:
    if not _user_dir(user_id).exists():
        raise HTTPException(status_code=404, detail=f"Unknown user_id: {user_id}")


def _list_weeks(user_id: str) -> List[int]:
    user_path = _user_dir(user_id)
    weeks = []
    for csv_path in sorted(user_path.glob("data_per_week*.csv")):
        name = csv_path.stem  # data_per_weekX
        try:
            week_num = int(name.replace("data_per_week", ""))
            weeks.append(week_num)
        except ValueError:
            continue
    return sorted(set(weeks))


def _read_week_csv(user_id: str, week: int) -> pd.DataFrame:
    csv_path = _user_dir(user_id) / f"data_per_week{week}.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail=f"data_per_week{week}.csv not found for {user_id}")
    df = pd.read_csv(csv_path)
    # normalize timestamp column
    time_col = None
    for cand in ["times", "timestamp", "time", "resp_time"]:
        if cand in df.columns:
            time_col = cand
            break
    if time_col is None:
        raise HTTPException(status_code=500, detail="No recognizable time column in week csv")
    df[time_col] = pd.to_datetime(df[time_col])
    return df


def _read_status_csv(user_id: str, kind: str) -> pd.DataFrame:
    # kind in {sleep, social, stress}
    csv_path = _user_dir(user_id) / f"{kind}_week_.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail=f"{kind}_week_.csv not found for {user_id}")
    df = pd.read_csv(csv_path)
    # find resp_time
    time_col = None
    for cand in ["resp_time", "times", "time"]:
        if cand in df.columns:
            time_col = cand
            break
    if time_col is None:
        raise HTTPException(status_code=500, detail=f"No recognizable time column in {kind}_week_.csv")
    df[time_col] = pd.to_datetime(df[time_col])
    return df


def _read_emotions(user_id: str) -> List[Dict[str, Any]]:
    jsonl_path = WORKSPACE_ROOT / f"{user_id}_emotion_status_history.jsonl"
    if not jsonl_path.exists():
        raise HTTPException(status_code=404, detail=f"{jsonl_path.name} not found")
    entries: List[Dict[str, Any]] = []
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entries.append(json.loads(line))
    return entries


app = FastAPI(title="Ubicomp Dashboard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/users")
def list_users() -> Dict[str, Any]:
    users = []
    for path in WORKSPACE_ROOT.iterdir():
        if path.is_dir() and path.name.startswith("u") and path.name[1:].isdigit():
            users.append(path.name)
    return {"users": sorted(users)}


@app.get("/api/{user_id}/weeks")
def list_user_weeks(user_id: str) -> Dict[str, Any]:
    _ensure_user(user_id)
    return {"weeks": _list_weeks(user_id)}

@app.get("/api/{user_id}/week/{week}/days")
def list_days(user_id: str, week: int) -> Dict[str, Any]:
    _ensure_user(user_id)
    df = _read_week_csv(user_id, week)
    time_col = "times" if "times" in df.columns else "resp_time" if "resp_time" in df.columns else None
    if time_col is None:
        raise HTTPException(status_code=500, detail="No recognizable time column in week csv")
    days = sorted({d.date().isoformat() for d in df[time_col]})
    return {"days": days}


@app.get("/api/{user_id}/week/{week}/locations")
def get_locations(user_id: str, week: int, day: Optional[str] = None) -> Dict[str, Any]:
    _ensure_user(user_id)
    df = _read_week_csv(user_id, week)
    time_col = "times" if "times" in df.columns else "resp_time" if "resp_time" in df.columns else None
    if time_col is None:
        raise HTTPException(status_code=500, detail="No recognizable time column in week csv")
    if day:
        try:
            day_dt = datetime.fromisoformat(day).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid day format; use YYYY-MM-DD")
        df = df[df[time_col].dt.date == day_dt]
    cols = df.columns
    # best-effort mapping
    result = []
    for _, row in df.iterrows():
        result.append({
            "time": row[time_col].isoformat(),
            "location": row.get("location", None),
            "location_des": row.get("location_des", None),
            "activity": row.get(" activity inference", row.get("activity inference", None)),
        })
    return {"records": result}


@app.get("/api/{user_id}/status/{kind}")
def get_status_timeseries(user_id: str, kind: str, week: Optional[int] = None, day: Optional[str] = None) -> Dict[str, Any]:
    if kind not in {"sleep", "social", "stress"}:
        raise HTTPException(status_code=400, detail="kind must be one of sleep|social|stress")
    _ensure_user(user_id)
    df = _read_status_csv(user_id, kind)
    time_col = "resp_time" if "resp_time" in df.columns else "times" if "times" in df.columns else None
    if time_col is None:
        raise HTTPException(status_code=500, detail="No recognizable time column in status csv")
    if week is not None and "week" in df.columns:
        df = df[df["week"] == week]
    if day:
        try:
            day_dt = datetime.fromisoformat(day).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid day format; use YYYY-MM-DD")
        df = df[df[time_col].dt.date == day_dt]
    value_key = {
        "sleep": "hour",
        "social": "number",
        "stress": "level",
    }[kind]
    records = []
    for _, row in df.iterrows():
        records.append({
            "time": row[time_col].isoformat(),
            "value": None if value_key not in df.columns or pd.isna(row.get(value_key)) else row.get(value_key),
            "week": int(row.get("week")) if "week" in df.columns and not pd.isna(row.get("week")) else None,
            "day_offset": int(row.get("day_offset")) if "day_offset" in df.columns and not pd.isna(row.get("day_offset")) else None,
        })
    return {"records": records}


@app.get("/api/{user_id}/emotions")
def get_emotions(user_id: str) -> Dict[str, Any]:
    entries = _read_emotions(user_id)
    return {"entries": entries}


@app.get("/api/{user_id}/profile")
def get_user_profile(user_id: str) -> Dict[str, Any]:
    _ensure_user(user_id)
    
    # Read CSV file using absolute path
    csv_path = WORKSPACE_ROOT / "result_pre_bigfive.csv"
    df_id_info = pd.read_csv(csv_path)
    id_info = df_id_info[df_id_info["uid"] == user_id]  # CSV uses 'uid' column
    
    if id_info.empty:
        raise HTTPException(status_code=404, detail=f"No personality data found for user {user_id}")
    
    big_five_profiles = id_info.to_dict(orient="records")[0]
    
    # Map CSV column names (capitalized) to expected format (lowercase)
    big_five_ = {
        "openness": big_five_profiles["Openness"],
        "conscientiousness": big_five_profiles["Conscientiousness"], 
        "extraversion": big_five_profiles["Extraversion"],
        "agreeableness": big_five_profiles["Agreeableness"],
        "neuroticism": big_five_profiles["Neuroticism"]
    }
    
    
    # Mock enrolled classes based on the emotion entries mentioning specific courses
    enrolled_classes = {
        'u01': [{'code': 'ENGS 069', 'name': 'Smartphone Programming', 'credits': 3},
        {'code': 'ENGS 022', 'name': 'None', 'credits': None},
        {'code': 'ANTH 012', 'name': 'None', 'credits': None}],
        'u02': [{'code': 'COSC 077', 'name': 'None', 'credits': None},
        {'code': 'COSC 098', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u03': [{'code': 'COSC 057', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u04': [{'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u05': [{'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'PSYC 028', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u07': [{'code': 'COSC 077', 'name': 'None', 'credits': None},
        {'code': 'COSC 060', 'name': 'Computer Networks', 'credits': 4},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u08': [{'code': 'CHIN 062', 'name': 'None', 'credits': None},
        {'code': 'COSC 089 1', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u09': [{'code': 'ANTH 050', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3},
        {'code': 'COSC 099', 'name': 'Senior Thesis Research', 'credits': 4}],
        'u10': [{'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'BIOL 004', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u12': [{'code': 'COSC 089 1', 'name': 'None', 'credits': None},
        {'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'TUCK 003', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u13': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u14': [{'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3},
        {'code': 'COSC 027', 'name': 'None', 'credits': None},
        {'code': 'COSC 020', 'name': 'None', 'credits': None}],
        'u15': [{'code': 'EARS 003', 'name': 'None', 'credits': None},
        {'code': 'SPAN 003', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u16': [{'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3},
        {'code': 'COSC 027', 'name': 'None', 'credits': None}],
        'u17': [{'code': 'COSC 089 1', 'name': 'None', 'credits': None},
        {'code': 'MUS 016', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u18': [{'code': 'COSC 089 1', 'name': 'None', 'credits': None},
        {'code': 'CHIN 033', 'name': 'None', 'credits': None},
        {'code': 'TUCK 003', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u19': [{'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3},
        {'code': 'FILM 051', 'name': 'None', 'credits': None}],
        'u20': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u22': [{'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'NAS 035', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u23': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u24': [{'code': 'M&SS 045', 'name': 'None', 'credits': None},
        {'code': 'COSC 060', 'name': 'Computer Networks', 'credits': 4},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u25': [{'code': 'NAS 008', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3},
        {'code': 'ENGL 028', 'name': 'None', 'credits': None}],
        'u27': [{'code': 'ECON 024', 'name': 'None', 'credits': None},
        {'code': 'JAPN 033', 'name': 'None', 'credits': None},
        {'code': 'FILM 042', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u30': [{'code': 'MUS 003', 'name': 'None', 'credits': None},
        {'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u31': [{'code': 'MUS 003', 'name': 'None', 'credits': None},
        {'code': 'COSC 077', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u32': [{'code': 'MATH 023', 'name': 'None', 'credits': None},
        {'code': 'COSC 069', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u33': [{'code': 'ENGS 025', 'name': 'None', 'credits': None},
        {'code': 'ENGS 069', 'name': 'Smartphone Programming', 'credits': 3},
        {'code': 'ENGS 093', 'name': 'None', 'credits': None}],
        'u34': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u35': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u41': [{'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'SPAN 002', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u42': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u43': [{'code': 'ENGS 031', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u44': [{'code': 'COSC 060', 'name': 'Computer Networks', 'credits': 4},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u45': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u46': [{'code': 'ECON 036', 'name': 'None', 'credits': None},
        {'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u47': [{'code': 'COSC 060', 'name': 'Computer Networks', 'credits': 4},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u49': [{'code': 'MATH 013', 'name': 'None', 'credits': None},
        {'code': 'LAT 003', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u50': [{'code': 'COSC 060', 'name': 'Computer Networks', 'credits': 4},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u51': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u52': [{'code': 'BIOL 006', 'name': 'None', 'credits': None},
        {'code': 'COSC 050', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u53': [{'code': 'COSC 089 1', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u54': [{'code': 'ENGS 025', 'name': 'None', 'credits': None},
        {'code': 'MATH 023', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u57': [{'code': 'COSC 098', 'name': 'None', 'credits': None},
        {'code': 'COSC 060', 'name': 'Computer Networks', 'credits': 4},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u58': [{'code': 'COSC 070', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3}],
        'u59': [{'code': 'GERM 001', 'name': 'None', 'credits': None},
        {'code': 'COSC 065', 'name': 'Smartphone Programming', 'credits': 3},
        {'code': 'COSC 007', 'name': 'None', 'credits': None}]
    }
    
    return {
        "user_id": user_id,
        "big_five": big_five_,
        "enrolled_classes": enrolled_classes.get(user_id, []),
        "display_name": f"Student {user_id.upper()}"
    }


@app.get("/api/{user_id}/week/{week}/summary")
def get_week_summary(user_id: str, week: int) -> Dict[str, Any]:
    # emotions per week from history file
    entries = _read_emotions(user_id)
    emo = next((e for e in entries if int(e.get("week")) == week), None)
    if emo is None:
        raise HTTPException(status_code=404, detail="No emotion entry for week")
    days = list_days(user_id, week)["days"]
    return {"week": week, "days": days, "emotion": emo.get("emotion"), "lab_assessment": emo.get("lab_assessment"), "weekly_desc": emo.get("weekly_desc")}

@app.post("/api/chat")
def chat_with_student(request: ChatRequest) -> Dict[str, Any]:
    try:
        client = genai.Client(api_key = request.apiKey)
        # Create personality description
        personality_traits = []
        for trait, value in request.bigFive.items():
            level = "high" if value >= 70 else "moderate" if value >= 40 else "low"
            personality_traits.append(f"{trait}: {level} ({value}/100)")

        personality_desc = ", ".join(personality_traits)

        
        # Create system prompt
        system_prompt = f"""You are {request.studentId.upper()}, a college student. Respond as this student would, based on your personality and recent experiences.

PERSONALITY (Big Five):
{personality_desc}

RECENT WEEK {request.week} EXPERIENCE:
{request.weeklyDesc}

Instructions:
Respond in first person as this student
Use a conversational, authentic student tone
Reference your personality traits and recent experiences naturally
Be honest about your struggles and successes
Keep responses conversational (2-3 sentences usually)
Show your emotions and thoughts based on your personality and week's events
"""

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=request.message)]
            )
        ]

        # Call Gemini API correctly
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.9,
                top_p=1.0,
                top_k=1,
                max_output_tokens=2048
            )
        )

        # # Format the contents properly
        # contents = [
        #     types.Content(
        #         role="user",
        #         parts=[types.Part.from_text(text=request.message)]
        #     )
        # ]

        # # Call Gemini API correctly
        # response = client.models.generate_content(
        #     model="gemini-2.0-flash",
        #     contents=contents,
        #     config=types.GenerateContentConfig(
        #         system_instruction=system_prompt,
        #         temperature=0.9,
        #         top_p=1.0,
        #         top_k=1,
        #         max_output_tokens=2048
        #     )
        # )

        # Extract result
        return {"response": response.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

    
@app.get("/api/test-gemini")
def test_gemini_api(api_key: Optional[str] = None) -> Dict[str, Any]:
    """Test endpoint to verify Gemini API connectivity using the same client as /api/chat"""
    try:
        # Optional: allow override of API key (mostly for debugging)
        test_api_key = api_key
        if not test_api_key:
            return {
                "success": False,
                "error": "API key not provided. Please set GEMINI_API_KEY environment variable or provide api_key parameter."
            }

        system_prompt = "You are a system tester. Only respond with: API connection successful."
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text="Say the exact phrase: API connection successful")]
            )
        ]

        # Call Gemini API via client (same as main code)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.1,
                top_p=0.95,
                top_k=2,
                max_output_tokens=50
            )
        )

        return {
            "success": True,
            "response": response.text,
            "message": "Gemini API connection successful!"
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Connection test failed: {str(e)}"
        }

def create_app() -> FastAPI:
    return app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("scripts.api_server:app", host="127.0.0.1", port=8089, reload=False)


