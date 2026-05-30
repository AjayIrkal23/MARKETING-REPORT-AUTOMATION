"""Admin user-management service layer.

Each public function corresponds to one admin action. All functions are
transport-free (no Request/Response objects) and raise typed ``AppError``
subclasses — see ``core.errors``. The controllers call these functions and
wrap the results in the standard envelope.

Contract: §3.8 / §3.9 of USER-MANAGEMENT-PLAN.md.
"""
