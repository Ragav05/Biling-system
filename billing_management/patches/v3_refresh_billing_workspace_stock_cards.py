from __future__ import annotations

from billing_management.patches.v1_setup_billing_workspace import setup_billing_workspace


def execute() -> None:
	"""Refresh the billing workspace block so existing sites get the latest script."""
	setup_billing_workspace()
