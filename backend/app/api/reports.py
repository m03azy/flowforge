"""
AI Reports API - Gathers business data and uses Google Gemini to generate
a structured weekly business intelligence report.
"""
import asyncio
import json
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.accounting import Transaction, TransactionType
from app.models.inventory import Product
from app.models.crm import Lead
from app.models.user import User
from app.middleware.auth import get_current_user
from app.config.settings import get_settings

router = APIRouter(prefix="/api/reports", tags=["AI Reports"])


def _gather_business_data(db: Session, org: str) -> dict:
    """Aggregate key metrics from all modules into a structured context dict, scoped to org."""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    # --- Accounting ---
    total_sales = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_name == org,
        Transaction.type == TransactionType.SALE,
    ).scalar() or 0.0

    total_expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_name == org,
        Transaction.type == TransactionType.EXPENSE,
    ).scalar() or 0.0

    recent_sales = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_name == org,
        Transaction.type == TransactionType.SALE,
        Transaction.date >= thirty_days_ago,
    ).scalar() or 0.0

    recent_expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_name == org,
        Transaction.type == TransactionType.EXPENSE,
        Transaction.date >= thirty_days_ago,
    ).scalar() or 0.0

    expense_categories = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.organisation_name == org,
        Transaction.type == TransactionType.EXPENSE,
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).limit(5).all()

    # --- CRM ---
    total_leads = db.query(func.count(Lead.id)).filter(Lead.organisation_name == org).scalar() or 0
    converted_leads = db.query(func.count(Lead.id)).filter(Lead.organisation_name == org, Lead.status == "Converted").scalar() or 0
    pipeline_value = db.query(func.sum(Lead.value)).filter(Lead.organisation_name == org, Lead.status != "Lost").scalar() or 0.0

    lead_by_status = db.query(
        Lead.status, func.count(Lead.id)
    ).filter(Lead.organisation_name == org).group_by(Lead.status).all()

    # --- Inventory ---
    total_products = db.query(func.count(Product.id)).filter(Product.organisation_name == org).scalar() or 0
    out_of_stock = db.query(func.count(Product.id)).filter(Product.organisation_name == org, Product.quantity_in_stock == 0).scalar() or 0
    low_stock = db.query(func.count(Product.id)).filter(
        Product.organisation_name == org,
        Product.quantity_in_stock > 0, Product.quantity_in_stock <= 10
    ).scalar() or 0
    inventory_value = db.query(
        func.sum(Product.unit_price * Product.quantity_in_stock)
    ).filter(Product.organisation_name == org).scalar() or 0.0

    low_stock_items = db.query(Product).filter(
        Product.organisation_name == org,
        Product.quantity_in_stock <= 10, Product.quantity_in_stock > 0
    ).order_by(Product.quantity_in_stock.asc()).limit(5).all()

    out_of_stock_items = db.query(Product).filter(
        Product.organisation_name == org,
        Product.quantity_in_stock == 0,
    ).limit(5).all()

    # --- Team ---
    total_employees = db.query(func.count(User.id)).filter(
        User.is_active == True,
        User.organisation_name == org,
    ).scalar() or 0

    return {
        "report_date": now.strftime("%B %d, %Y"),
        "organisation": org,
        "accounting": {
            "all_time": {
                "total_sales": round(total_sales, 2),
                "total_expenses": round(total_expenses, 2),
                "net_profit": round(total_sales - total_expenses, 2),
            },
            "last_30_days": {
                "sales": round(recent_sales, 2),
                "expenses": round(recent_expenses, 2),
                "net": round(recent_sales - recent_expenses, 2),
            },
            "top_expense_categories": [
                {"category": cat, "total": round(float(total), 2)}
                for cat, total in expense_categories
            ]
        },
        "crm": {
            "total_leads": total_leads,
            "converted_leads": converted_leads,
            "conversion_rate_pct": round((converted_leads / total_leads * 100) if total_leads > 0 else 0, 1),
            "pipeline_value": round(float(pipeline_value), 2),
            "leads_by_status": {status: count for status, count in lead_by_status},
        },
        "inventory": {
            "total_products": total_products,
            "out_of_stock_count": out_of_stock,
            "low_stock_count": low_stock,
            "total_inventory_value": round(float(inventory_value), 2),
            "low_stock_items": [
                {"name": p.name, "sku": p.sku, "qty": p.quantity_in_stock}
                for p in low_stock_items
            ],
            "out_of_stock_items": [
                {"name": p.name, "sku": p.sku}
                for p in out_of_stock_items
            ],
        },
        "team": {
            "active_employees": total_employees
        }
    }


def _build_prompt(data: dict) -> str:
    """Build a structured prompt for the AI model."""
    data_json = json.dumps(data, indent=2)
    return f"""You are an expert business analyst AI. Based on the following real-time business data from our ERP system, generate a comprehensive, insightful, and actionable business intelligence report.

BUSINESS DATA (as of {data['report_date']}):
```json
{data_json}
```

Please generate a detailed report in Markdown format with the following sections:

# 📊 Business Intelligence Report — {data['report_date']}

## Executive Summary
(2-3 sentence high-level overview of the business's health)

## 💰 Financial Performance
(Analyze revenue, expenses, net profit. Comment on trends, highlight concerns or wins.)

## 🎯 CRM & Sales Pipeline
(Analyze lead counts, conversion rates, and pipeline value. Identify opportunities.)

## 📦 Inventory & Stock Health
(Analyze inventory status, highlight critical out-of-stock items and low-stock warnings.)

## 👥 Team Overview
(Brief note on team size and capacity.)

## ⚠️ Key Risks & Recommendations
(List 3-5 specific, actionable recommendations based on the data, formatted as bullet points.)

## ✅ Action Items
(List 3-5 specific, immediate actions the business owner should take today, numbered.)

Use concrete numbers from the data. Be specific, not generic. Write in a professional but engaging tone.
"""


@router.post("/generate")
async def generate_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an AI-powered business intelligence report using Google Gemini."""
    settings = get_settings()

    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI Reports require a GEMINI_API_KEY. Please add it to your environment configuration."
        )

    # Step 1: Gather all business data
    org = current_user.organisation_name or "default"
    business_data = _gather_business_data(db, org)

    # Step 2: Build the prompt
    prompt = _build_prompt(business_data)

    # Step 3: Call the Gemini API with retry + model fallback
    # Try primary model first, fall back to a lighter model on 503/429/overload.
    MODELS_TO_TRY = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-lite",
    ]
    MAX_RETRIES = 3
    RETRY_DELAY = 4  # seconds between retries

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        }
    }

    last_error = "Unknown error"
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in MODELS_TO_TRY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    response = await client.post(url, json=payload)

                    # Retry on 503 (overloaded) and 429 (rate limited)
                    if response.status_code in (503, 429):
                        wait = RETRY_DELAY * attempt
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(wait)
                            continue  # retry same model
                        else:
                            last_error = f"Gemini API error: {response.status_code} - {response.text[:200]}"
                            break  # try next model

                    response.raise_for_status()
                    result = response.json()

                    report_text = result["candidates"][0]["content"]["parts"][0]["text"]
                    return {
                        "report": report_text,
                        "data_snapshot": business_data,
                        "generated_at": business_data["report_date"],
                        "model_used": model,
                    }

                except httpx.HTTPStatusError as e:
                    last_error = f"Gemini API error: {e.response.status_code} - {e.response.text[:200]}"
                    if e.response.status_code in (503, 429) and attempt < MAX_RETRIES:
                        await asyncio.sleep(RETRY_DELAY * attempt)
                        continue
                    break  # move to next model

                except Exception as e:
                    last_error = str(e)
                    break  # non-HTTP error, skip to next model

    raise HTTPException(
        status_code=503,
        detail=f"All Gemini models are currently unavailable. Please try again in a few minutes. Last error: {last_error}"
    )
