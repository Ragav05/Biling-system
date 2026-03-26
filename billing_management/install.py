from __future__ import annotations

from billing_management.patches.v1_setup_billing_workspace import setup_billing_workspace


def after_install() -> None:
	# Create workspace/dashboard objects needed for Billing module.
	setup_billing_workspace()

