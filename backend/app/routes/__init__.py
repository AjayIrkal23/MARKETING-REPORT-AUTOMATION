"""Route registry: aggregate every domain router into one ``api_router``."""

from __future__ import annotations

from fastapi import APIRouter

from . import (
    admin_user,
    analytics,
    audit_log,
    auth,
    coil_price,
    credit_report,
    customer_code,
    dashboard,
    jsw_stock,
    jvml_stock,
    meta,
    region,
    report,
    user,
)

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(admin_user.router)
api_router.include_router(audit_log.router)
api_router.include_router(region.router)
api_router.include_router(coil_price.router)
api_router.include_router(customer_code.router)
api_router.include_router(jsw_stock.router)
api_router.include_router(jsw_stock.config_router)
api_router.include_router(jvml_stock.router)
api_router.include_router(jvml_stock.config_router)
api_router.include_router(credit_report.router)
api_router.include_router(credit_report.config_router)
api_router.include_router(dashboard.router)
api_router.include_router(report.router)
api_router.include_router(analytics.router)

__all__ = ["api_router"]
