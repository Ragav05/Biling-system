from __future__ import annotations

import json

import frappe


WORKSPACE_NAME = "POS and Restaurant"


def execute() -> None:
	if not frappe.db.exists("Workspace", WORKSPACE_NAME):
		return

	workspace = frappe.get_doc("Workspace", WORKSPACE_NAME)
	content = json.loads(workspace.content or "[]")
	shortcut_names = {
		block.get("data", {}).get("shortcut_name") for block in content if block.get("type") == "shortcut"
	}

	if "Kitchen Production" not in shortcut_names:
		content.insert(
			6,
			{
				"id": "pos-kitchen-production",
				"type": "shortcut",
				"data": {"shortcut_name": "Kitchen Production", "col": 3},
			},
		)

	workspace.content = json.dumps(content)

	if not any(shortcut.label == "Kitchen Production" for shortcut in workspace.shortcuts):
		workspace.append(
			"shortcuts",
			{
				"color": "Cyan",
				"doc_view": "List",
				"label": "Kitchen Production",
				"link_to": "Kitchen Production Entry",
				"type": "DocType",
			},
		)

	if not any(link.label == "Kitchen Production Entries" for link in workspace.links):
		insert_at = None
		for idx, link in enumerate(workspace.links):
			if link.label == "Kitchen Stations":
				insert_at = idx + 1
				break
		workspace.append(
			"links",
			{
				"hidden": 0,
				"is_query_report": 0,
				"label": "Kitchen Production Entries",
				"link_to": "Kitchen Production Entry",
				"link_type": "DocType",
				"onboard": 1,
				"type": "Link",
			},
		)
		if insert_at is not None:
			workspace.links.insert(insert_at, workspace.links.pop())

	workspace.save(ignore_permissions=True)
