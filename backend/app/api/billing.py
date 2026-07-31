from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/billing", tags=["Subscriptions & Billing"])


class PlanUpgradeRequest(BaseModel):
    plan: str  # starter | professional | enterprise


class AddOnServiceRequest(BaseModel):
    service_id: str
    notes: Optional[str] = None


PLANS_CATALOG = {
    "starter": {
        "id": "starter",
        "name": "Starter Plan",
        "price_monthly": 49,
        "tagline": "Ideal for small businesses & single site operations",
        "features": [
            "AI Chat Assistant & Search",
            "Core CRM & Lead Management",
            "Basic Event-Driven Workflows (up to 5 active)",
            "Appointment & Resource Booking",
            "Standard Business Reports"
        ],
        "limits": {
            "max_users": 5,
            "max_workflows": 5,
            "ai_report_generations": 20
        }
    },
    "professional": {
        "id": "professional",
        "name": "Professional Plan",
        "price_monthly": 149,
        "tagline": "For growing companies with multiple departments & advanced needs",
        "features": [
            "Everything in Starter",
            "Multi-Department Management & Directory",
            "Advanced Automations & Custom Triggers",
            "WhatsApp, Email & SMS Automation Hooks",
            "Inventory & Stock Management",
            "Accounting & Profit Summary Dashboards",
            "Unlimited AI Reports"
        ],
        "limits": {
            "max_users": 25,
            "max_workflows": 50,
            "ai_report_generations": "Unlimited"
        }
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise Plan",
        "price_monthly": 499,
        "tagline": "Unlimited scale, dedicated AI agents, SSO & on-premise option",
        "features": [
            "Everything in Professional",
            "Unlimited Users & Departments",
            "Single Sign-On (SSO) & Passkeys Support",
            "Custom AI Agents (HR, Sales, Support, Finance)",
            "Dedicated 24/7 Account Manager & Priority Support",
            "On-Premises / Private Cloud Deployment Option",
            "Full Developer SDK & Custom API Rate Limits"
        ],
        "limits": {
            "max_users": "Unlimited",
            "max_workflows": "Unlimited",
            "ai_report_generations": "Unlimited"
        }
    }
}

ADDON_SERVICES_CATALOG = [
    {
        "id": "onboarding",
        "name": "Implementation & Onboarding",
        "category": "Setup",
        "price": 500,
        "description": "Full end-to-end setup, data migration, and department onboarding by our solution engineers."
    },
    {
        "id": "custom_workflows",
        "name": "Custom Workflow Development",
        "category": "Automation",
        "price": 350,
        "description": "Tailored automation buildout (triggers, custom rules, API webhooks, multi-step actions)."
    },
    {
        "id": "kb_setup",
        "name": "AI Knowledge Base Setup (RAG)",
        "category": "AI",
        "price": 450,
        "description": "Ingestion & vectorization of company PDFs, manuals, policies, and DOCX files into AI memory."
    },
    {
        "id": "api_integration",
        "name": "API Integration Services",
        "category": "Integrations",
        "price": 600,
        "description": "Custom connector development for ERPs, CRDB/NMB/NBC bank APIs, Stripe, or legacy systems."
    },
    {
        "id": "user_training",
        "name": "User Training & Certification",
        "category": "Training",
        "price": 300,
        "description": "Interactive staff training sessions, role-based walkthroughs, and operating procedure guides."
    },
    {
        "id": "premium_support",
        "name": "Premium 24/7 SLA Support",
        "category": "Support",
        "price": 250,
        "description": "Dedicated SLA response time under 15 minutes, 24/7 hotline, and account management.",
        "recurring": "monthly"
    },
    {
        "id": "marketplace_extensions",
        "name": "Marketplace Extensions License",
        "category": "Add-ons",
        "price": 199,
        "description": "Access to pre-built industry marketplace plugins (POS, Hospital EHR, School Grading, Hotel PMS)."
    }
]


@router.get("/plan")
def get_subscription_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve current subscription plan, catalog, and add-on services."""
    org = current_user.organisation_name or "default"
    current_plan_id = current_user.subscription_plan or "starter"
    
    # Count org active users
    user_count = db.query(User).filter(
        User.organisation_name == org,
        User.is_active == True
    ).count()

    current_plan = PLANS_CATALOG.get(current_plan_id, PLANS_CATALOG["starter"])

    return {
        "organisation_name": org,
        "current_plan": current_plan,
        "user_count": user_count,
        "plans_catalog": list(PLANS_CATALOG.values()),
        "addon_services": ADDON_SERVICES_CATALOG
    }


@router.post("/upgrade")
def upgrade_subscription_plan(
    payload: PlanUpgradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upgrade or switch subscription plan. Admins only."""
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Organisation Admins can modify subscription plans"
        )

    if payload.plan not in PLANS_CATALOG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan selected. Choose from: {list(PLANS_CATALOG.keys())}"
        )

    org = current_user.organisation_name or "default"
    
    # Update all users in organisation to the new plan
    org_users = db.query(User).filter(User.organisation_name == org).all()
    for u in org_users:
        u.subscription_plan = payload.plan

    db.commit()

    return {
        "message": f"Successfully updated subscription plan for {org} to {PLANS_CATALOG[payload.plan]['name']}",
        "new_plan": PLANS_CATALOG[payload.plan]
    }


@router.post("/addon-request")
def request_addon_service(
    payload: AddOnServiceRequest,
    current_user: User = Depends(get_current_user),
):
    """Submit a request for professional services or add-on modules."""
    service = next((s for s in ADDON_SERVICES_CATALOG if s["id"] == payload.service_id), None)
    if not service:
        raise HTTPException(status_code=400, detail="Add-on service not found")

    return {
        "status": "success",
        "message": f"Your request for '{service['name']}' has been submitted. Our solutions engineer will contact {current_user.email} shortly.",
        "service": service,
        "requested_by": current_user.email,
        "organisation": current_user.organisation_name or "default"
    }
