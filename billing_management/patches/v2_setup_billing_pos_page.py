from __future__ import annotations

import frappe


def execute() -> None:
	"""Create Billing POS page route (desk Page doctype)."""
	page_name = "billing-dashboard"

	# Ensure Module Def exists (required for Page.module field)
	if not frappe.db.exists("Module Def", "Billing"):
		module_def = frappe.new_doc("Module Def")
		module_def.module_name = "Billing"
		module_def.app_name = "billing_management"
		module_def.custom = 0
		module_def.insert(ignore_permissions=True)

	if frappe.db.exists("Page", page_name):
		return
	# In some environments, inserting a new Page can fail validation unless developer mode is enabled.
	# Since we only need a working desk route, insert the row directly.
	now = frappe.utils.now_datetime()
	user = frappe.session.user or "Administrator"

	frappe.db.sql(
		"""
		INSERT INTO `tabPage`
			(name, owner, creation, modified, modified_by, docstatus, idx, system_page,
			 page_name, title, icon, module, restrict_to_domain, standard)
		VALUES
			(%(name)s, %(owner)s, %(creation)s, %(modified)s, %(modified_by)s, 0, 0, 0,
			 %(page_name)s, %(title)s, %(icon)s, %(module)s, %(restrict_to_domain)s, %(standard)s)
		""",
		{
			"name": page_name,
			"owner": user,
			"creation": now,
			"modified": now,
			"modified_by": user,
			"page_name": page_name,
			"title": "Billing POS",
			"icon": "fa fa-shopping-cart",
			"module": "Billing",
			"restrict_to_domain": None,
			"standard": "No",
		},
	)

