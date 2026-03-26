from __future__ import annotations

from datetime import date

import frappe
from frappe.utils import flt

from billing_management.billing.stock.stock_service import create_and_submit_stock_ledger_entry


def _get_one(doctype: str, *, filters: dict | None = None, field: str = "name") -> str | None:
	return frappe.db.get_value(doctype, filters=filters or {}, fieldname=field)


def _get_or_create_customer() -> str:
	customer_name = "Demo Customer"

	existing = frappe.db.exists("Customer", {"customer_name": customer_name})
	if existing:
		return existing

	doc = frappe.new_doc("Customer")
	# Customer has many fields; these are typically sufficient.
	doc.customer_name = customer_name
	doc.insert(ignore_permissions=True)
	return doc.name


def _get_default_warehouse() -> str:
	warehouse = _get_one("Warehouse")
	if not warehouse:
		frappe.throw("No Warehouse found. Create one before loading demo data.")
	return warehouse


def _get_default_uom() -> str:
	# Use the first UOM in the system (commonly "Nos").
	uom = _get_one("UOM")
	if not uom:
		frappe.throw("No UOM found. Create one before loading demo data.")
	return uom


def _upsert_billing_item(*, item_code: str, item_name: str, default_warehouse: str, stock_uom: str, default_rate: float) -> None:
	if frappe.db.exists("Billing Item", item_code):
		doc = frappe.get_doc("Billing Item", item_code)
	else:
		doc = frappe.new_doc("Billing Item")
		doc.item_code = item_code

	doc.item_name = item_name
	doc.is_stock_item = 1
	doc.default_warehouse = default_warehouse
	doc.stock_uom = stock_uom
	doc.default_rate = flt(default_rate)
	doc.reorder_level = 5  # used as low stock threshold by dashboard (if minimum_stock isn't present)
	doc.is_active = 1
	doc.description = "Demo Billing Item"

	doc.flags.ignore_validate_update_after_submit = 1
	doc.save(ignore_permissions=True)


def _post_opening_stock(*, item_code: str, warehouse: str, qty: float) -> None:
	# Post an "opening" Stock Ledger entry. Use voucher_type/voucher_no as idempotency key.
	voucher_type = "Billing Item Opening"
	voucher_no = item_code
	if frappe.db.exists("Stock Ledger", {"voucher_type": voucher_type, "voucher_no": voucher_no, "transaction_type": "In"}):
		return

	create_and_submit_stock_ledger_entry(
		item=item_code,
		warehouse=warehouse,
		qty=flt(qty),
		transaction_type="In",
		voucher_type=voucher_type,
		voucher_no=voucher_no,
		posting_date=str(date.today()),
		description=f"Opening stock for {item_code}",
	)


def _get_or_create_invoice(*, invoice_number: str, customer: str, posting_date: str, items: list[dict]) -> str:
	if frappe.db.exists("Billing Invoice", invoice_number):
		doc = frappe.get_doc("Billing Invoice", invoice_number)
	else:
		doc = frappe.new_doc("Billing Invoice")
		doc.invoice_number = invoice_number
		doc.customer = customer
		doc.posting_date = posting_date

	# Clear and re-add items (keeps demo deterministic).
	doc.set("items", [])
	for row in items:
		child = doc.append("items", {})
		child.item_code = row["item_code"]
		child.qty = flt(row.get("qty", 1))
		child.rate = flt(row.get("rate", 0))
		child.warehouse = row.get("warehouse")  # optional override

	doc.flags.ignore_validate_update_after_submit = 1
	doc.save(ignore_permissions=True)
	return doc.name


def populate_demo_data() -> dict[str, list[str]]:
	"""Populate basic demo data: items, opening stock, and invoices.

	Returns created record names.
	"""
	warehouse = _get_default_warehouse()
	uom = _get_default_uom()
	customer = _get_or_create_customer()

	items_created: list[str] = []
	_invoices_created: list[str] = []

	# 1) Create 2 demo billing items + opening stock
	item_1 = {"item_code": "DEMO-ITEM-001", "item_name": "Demo Item A", "default_rate": 50.0, "opening_qty": 20}
	item_2 = {"item_code": "DEMO-ITEM-002", "item_name": "Demo Item B", "default_rate": 120.0, "opening_qty": 8}

	for item in (item_1, item_2):
		_upsert_billing_item(
			item_code=item["item_code"],
			item_name=item["item_name"],
			default_warehouse=warehouse,
			stock_uom=uom,
			default_rate=item["default_rate"],
		)
		items_created.append(item["item_code"])
		_post_opening_stock(item_code=item["item_code"], warehouse=warehouse, qty=item["opening_qty"])

	# 2) Create + submit 2 invoices
	today = str(date.today())

	inv_1 = _get_or_create_invoice(
		invoice_number="DEMO-INV-001",
		customer=customer,
		posting_date=today,
		items=[
			{"item_code": item_1["item_code"], "qty": 3, "rate": item_1["default_rate"]},
			{"item_code": item_2["item_code"], "qty": 2, "rate": item_2["default_rate"]},
		],
	)

	# Submit if not submitted
	inv_doc = frappe.get_doc("Billing Invoice", inv_1)
	if inv_doc.docstatus == 0:
		inv_doc.submit()

	# Mark paid to demonstrate status
	frappe.call("billing_management.billing.doctype.billing_invoice.billing_invoice.mark_as_paid", invoice_name=inv_1)
	_invoices_created.append(inv_1)

	inv_2 = _get_or_create_invoice(
		invoice_number="DEMO-INV-002",
		customer=customer,
		posting_date=today,
		items=[
			{"item_code": item_2["item_code"], "qty": 5, "rate": item_2["default_rate"]},
		],
	)
	inv_doc2 = frappe.get_doc("Billing Invoice", inv_2)
	if inv_doc2.docstatus == 0:
		inv_doc2.submit()
	_invoices_created.append(inv_2)

	return {"items": items_created, "invoices": _invoices_created}

