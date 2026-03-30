from __future__ import annotations

import frappe
from frappe.model.rename_doc import rename_doc


OLD_WORKSPACE_NAME = "POS & Restaurant"
NEW_WORKSPACE_NAME = "POS and Restaurant"


def execute() -> None:
	"""Rename the POS workspace to a route-safe name on existing sites."""
	if frappe.db.exists("Workspace", OLD_WORKSPACE_NAME) and frappe.db.exists(
		"Workspace", NEW_WORKSPACE_NAME
	):
		frappe.delete_doc("Workspace", OLD_WORKSPACE_NAME, ignore_permissions=True, force=True)

	if frappe.db.exists("Workspace", OLD_WORKSPACE_NAME):
		rename_doc("Workspace", OLD_WORKSPACE_NAME, NEW_WORKSPACE_NAME, force=True, merge=False)

	if frappe.db.exists("Workspace", NEW_WORKSPACE_NAME):
		workspace = frappe.get_doc("Workspace", NEW_WORKSPACE_NAME)
		workspace.label = NEW_WORKSPACE_NAME
		workspace.title = NEW_WORKSPACE_NAME
		workspace.public = 1
		workspace.save(ignore_permissions=True)
