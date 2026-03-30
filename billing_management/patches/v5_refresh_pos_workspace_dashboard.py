from __future__ import annotations

import json

import frappe


WORKSPACE_NAME = "POS and Restaurant"

WORKSPACE_CONTENT = [
	{
		"id": "pos-hero",
		"type": "header",
		"data": {
			"text": '<div style="background: linear-gradient(135deg, #4338ca 0%, #2563eb 48%, #0f766e 100%); padding: 32px; border-radius: 18px; color: white; box-shadow: 0 18px 40px rgba(37, 99, 235, 0.18);"><div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.8; margin-bottom: 8px;">Restaurant Command Center</div><h2 style="margin: 0 0 10px 0; font-size: 32px; font-weight: 700;">POS and Restaurant Dashboard</h2><p style="margin: 0; opacity: 0.92; font-size: 15px;">Run billing, live orders, tables, kitchen, invoices, and menu control from one dashboard.</p></div>',
			"col": 12,
		},
	},
	{"id": "pos-1", "type": "shortcut", "data": {"shortcut_name": "Restaurant POS", "col": 3}},
	{"id": "pos-2", "type": "shortcut", "data": {"shortcut_name": "Live Orders", "col": 3}},
	{"id": "pos-3", "type": "shortcut", "data": {"shortcut_name": "POS Orders", "col": 3}},
	{"id": "pos-4", "type": "shortcut", "data": {"shortcut_name": "Tables", "col": 3}},
	{"id": "pos-5", "type": "shortcut", "data": {"shortcut_name": "Kitchen", "col": 3}},
	{"id": "pos-6", "type": "shortcut", "data": {"shortcut_name": "Billing Invoices", "col": 3}},
	{"id": "pos-7", "type": "shortcut", "data": {"shortcut_name": "Menu Items", "col": 3}},
	{"id": "pos-8", "type": "shortcut", "data": {"shortcut_name": "Stock Ledger", "col": 3}},
]

WORKSPACE_SHORTCUTS = [
	{
		"color": "Blue",
		"doc_view": "",
		"label": "Restaurant POS",
		"link_to": "billing-dashboard",
		"type": "Page",
	},
	{"color": "Green", "doc_view": "", "label": "Live Orders", "link_to": "live-orders", "type": "Page"},
	{"color": "Purple", "doc_view": "List", "label": "POS Orders", "link_to": "POS Order", "type": "DocType"},
	{
		"color": "Orange",
		"doc_view": "List",
		"label": "Tables",
		"link_to": "Restaurant Table",
		"type": "DocType",
	},
	{"color": "Red", "doc_view": "List", "label": "Kitchen", "link_to": "Kitchen Station", "type": "DocType"},
	{
		"color": "Teal",
		"doc_view": "List",
		"label": "Billing Invoices",
		"link_to": "Billing Invoice",
		"type": "DocType",
	},
	{
		"color": "Yellow",
		"doc_view": "List",
		"label": "Menu Items",
		"link_to": "Billing Item",
		"type": "DocType",
	},
	{
		"color": "Dark Grey",
		"doc_view": "List",
		"label": "Stock Ledger",
		"link_to": "Stock Ledger",
		"type": "DocType",
	},
]


def execute() -> None:
	if not frappe.db.exists("Workspace", WORKSPACE_NAME):
		return

	workspace = frappe.get_doc("Workspace", WORKSPACE_NAME)
	workspace.title = WORKSPACE_NAME
	workspace.label = WORKSPACE_NAME
	workspace.content = json.dumps(WORKSPACE_CONTENT)
	workspace.set("shortcuts", [])
	for shortcut in WORKSPACE_SHORTCUTS:
		workspace.append("shortcuts", shortcut)
	workspace.save(ignore_permissions=True)
