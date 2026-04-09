from __future__ import annotations

import frappe  # type: ignore
from frappe.utils import cint, flt  # type: ignore

from billing_management.billing.pricing import get_effective_item_rate
from billing_management.billing.stock.stock_service import create_and_submit_stock_ledger_entry


VALID_PAYMENT_METHODS = ("Cash", "Card", "UPI", "Wallet", "Net Banking", "Credit")


def _get_float_precision() -> int:
	return cint(frappe.db.get_single_value("System Settings", "float_precision") or 0)


def _coerce_items_payload(items: object) -> list[dict]:
	"""Accept either list payload or JSON string payload from frappe.call."""
	if isinstance(items, str):
		items = frappe.parse_json(items)

	if not isinstance(items, list):
		frappe.throw(frappe._("Invalid cart payload. Items must be a list."))

	for row in items:
		if not isinstance(row, dict):
			frappe.throw(frappe._("Invalid cart row payload. Each item must be an object."))

	return items


def _resolve_cart(items: object, posting_date: str | None) -> list[dict]:
	rows = _coerce_items_payload(items)
	if not rows:
		frappe.throw(frappe._("Cart cannot be empty"))

	item_codes = tuple({row.get("item_code") for row in rows if row.get("item_code")})
	if not item_codes:
		frappe.throw(frappe._("Cart items must have item_code"))

	billing_items = frappe.get_all(
		"Billing Item",
		fields=[
			"name",
			"item_name",
			"item_category",
			"food_type",
			"description",
			"kitchen_station",
			"is_stock_item",
			"default_warehouse",
		],
		filters={"name": ["in", item_codes]},
	)
	item_map = {row["name"]: row for row in billing_items}

	resolved: list[dict] = []
	for row in rows:
		item_code = row.get("item_code")
		if not item_code:
			continue
		item = item_map.get(item_code)
		if not item:
			frappe.throw(frappe._("Unknown Billing Item: {0}").format(item_code))
		if not item.get("is_stock_item"):
			frappe.throw(frappe._("Item {0} is not marked as a stock item").format(item_code))

		qty = flt(row.get("qty") or 0)
		if qty <= 0:
			frappe.throw(frappe._("Quantity must be greater than 0 for {0}").format(item_code))

		warehouse = row.get("warehouse") or item.get("default_warehouse")
		if not warehouse:
			frappe.throw(frappe._("Default warehouse is required for item {0}").format(item_code))

		rate = row.get("rate")
		if rate is None or rate == "" or flt(rate) == 0:
			rate = get_effective_item_rate(item_code, posting_date=posting_date)

		resolved.append(
			{
				"item_code": item_code,
				"item_name": item.get("item_name") or item_code,
				"item_category": item.get("item_category"),
				"food_type": item.get("food_type"),
				"description": item.get("description"),
				"qty": qty,
				"rate": flt(rate),
				"warehouse": warehouse,
				"send_to_kitchen": cint(row.get("send_to_kitchen", 1)),
				"item_modifications": row.get("item_modifications") or "",
				"kitchen_station": row.get("kitchen_station") or item.get("kitchen_station"),
			}
		)

	return resolved


def _get_default_customer(customer: str | None = None) -> str | None:
	if customer:
		return customer

	default_customer = frappe.db.get_value("Customer", {"customer_name": "Walk-in Customer"}, "name")
	if default_customer:
		return default_customer

	return frappe.db.get_value("Customer", {}, "name")


def _calculate_totals(resolved_cart: list[dict], discount_percentage: float, service_charge: float) -> dict:
	precision = _get_float_precision()
	subtotal = sum(flt(row["qty"]) * flt(row["rate"]) for row in resolved_cart)
	discount_amount = flt(round(subtotal * flt(discount_percentage) / 100, precision))
	grand_total = flt(round(subtotal - discount_amount + flt(service_charge), precision))
	return {
		"subtotal": flt(round(subtotal, precision)),
		"discount_amount": discount_amount,
		"grand_total": grand_total,
	}


def _create_invoice_for_pos_order(
	pos_order_name: str,
	*,
	payment_method: str | None = None,
	payment_amount: float | None = None,
	mark_paid: bool = False,
) -> dict:
	order = frappe.get_doc("POS Order", pos_order_name)
	if order.billing_invoice:
		invoice = frappe.get_doc("Billing Invoice", order.billing_invoice)
		if mark_paid and invoice.status != "Paid":
			frappe.get_attr(
				"billing_management.billing.doctype.billing_invoice.billing_invoice.mark_as_paid"
			)(invoice.name)
			invoice.reload()
		return {
			"invoice_name": invoice.name,
			"invoice_number": invoice.invoice_number,
			"status": invoice.status,
			"grand_total": flt(invoice.grand_total),
		}

	precision = _get_float_precision()
	discount_percentage = 0
	if flt(order.total_amount):
		discount_percentage = flt((flt(order.discount_amount) / flt(order.total_amount)) * 100, precision)

	invoice = frappe.new_doc("Billing Invoice")
	invoice.invoice_number = f"POS-{frappe.utils.nowdate()}-{frappe.generate_hash(length=6)}"
	invoice.posting_date = order.posting_date
	invoice.posting_time = order.posting_time
	invoice.customer = order.customer
	invoice.customer_name = order.customer_name
	invoice.mobile_no = order.mobile_no
	invoice.order_type = order.order_type
	invoice.table_number = order.table_no
	invoice.order_number = order.name
	invoice.pos_order = order.name
	invoice.discount_percentage = discount_percentage
	invoice.service_charge = flt(order.service_charge)
	invoice.payment_method = payment_method or order.payment_method
	invoice.paid_amount = flt(payment_amount or 0)
	invoice.remarks = order.remarks
	invoice.kitchen_status = order.kitchen_status

	for item in order.items:
		child = invoice.append("items", {})
		child.item_code = item.item_code
		child.qty = item.qty
		child.rate = item.rate
		child.warehouse = item.warehouse
		child.item_modifications = item.item_modifications
		child.send_to_kitchen = item.send_to_kitchen
		child.kitchen_station = item.kitchen_station

	invoice.insert(ignore_permissions=True)
	invoice.submit()

	order.db_set("billing_invoice", invoice.name, update_modified=False)
	order.db_set("payment_status", "Paid" if mark_paid else "Unpaid", update_modified=False)

	if mark_paid:
		expected_total = flt(invoice.grand_total)
		received = flt(payment_amount or expected_total)
		if round(received, precision) != round(expected_total, precision):
			frappe.throw(
				frappe._("Payment amount ({0}) must equal Total ({1})").format(received, expected_total)
			)
		invoice.db_set("payment_method", payment_method, update_modified=False)
		invoice.db_set("paid_amount", received, update_modified=False)
		frappe.get_attr("billing_management.billing.doctype.billing_invoice.billing_invoice.mark_as_paid")(
			invoice.name
		)
		invoice.reload()

	return {
		"invoice_name": invoice.name,
		"invoice_number": invoice.invoice_number,
		"status": invoice.status,
		"grand_total": flt(invoice.grand_total),
	}


@frappe.whitelist()
def get_restaurant_pos_context() -> dict:
	"""Dashboard context for the restaurant POS landing screen."""
	tables = frappe.get_all(
		"Restaurant Table",
		filters={"is_active": 1},
		fields=["name", "table_name", "table_number", "zone", "is_available", "max_capacity"],
		order_by="table_number asc",
	)
	stats = frappe.db.sql(
		"""
		SELECT
			COUNT(*) AS active_orders,
			SUM(CASE WHEN order_type = 'Takeaway' THEN 1 ELSE 0 END) AS takeaway_orders,
			SUM(CASE WHEN payment_status = 'Unpaid' THEN 1 ELSE 0 END) AS unpaid_orders,
			SUM(CASE WHEN kitchen_status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) AS kitchen_queue
		FROM `tabPOS Order`
		WHERE docstatus = 1
			AND order_status NOT IN ('Served', 'Picked Up', 'Cancelled')
		""",
		as_dict=True,
	)[0]
	available_tables = len([row for row in tables if cint(row.is_available)])
	return {
		"tables": tables,
		"stats": {
			"active_orders": cint(stats.active_orders or 0),
			"takeaway_orders": cint(stats.takeaway_orders or 0),
			"unpaid_orders": cint(stats.unpaid_orders or 0),
			"kitchen_queue": cint(stats.kitchen_queue or 0),
			"available_tables": available_tables,
			"occupied_tables": max(len(tables) - available_tables, 0),
		},
	}


@frappe.whitelist()
def get_pos_items(search: str | None = None, limit: int = 100, posting_date: str | None = None) -> list[dict]:
	"""Return POS items with available stock in each item's default warehouse."""
	filters: list = [["is_active", "=", 1]]
	if search:
		search_like = f"%{search.strip()}%"
		filters = filters + [["name", "like", search_like]]

	limit = max(1, min(int(limit or 100), 200))
	items = frappe.get_all(
		"Billing Item",
		fields=[
			"name",
			"item_name",
			"item_category",
			"food_type",
			"default_warehouse",
			"kitchen_station",
			"image",
		],
		filters=filters,
		limit_page_length=limit,
	)
	if not items:
		return []

	item_codes = tuple(item["name"] for item in items)
	warehouses = tuple(set(item["default_warehouse"] for item in items if item.get("default_warehouse")))
	ledger_rows = frappe.db.sql(
		"""
		SELECT item, warehouse, COALESCE(SUM(qty), 0) AS current_qty
		FROM `tabStock Ledger`
		WHERE docstatus = 1
			AND item IN %(items)s
			AND warehouse IN %(warehouses)s
		GROUP BY item, warehouse
		""",
		{"items": item_codes, "warehouses": warehouses},
		as_dict=True,
	)
	qty_map = {(row.item, row.warehouse): float(row.current_qty or 0) for row in ledger_rows}

	out: list[dict] = []
	for item in items:
		item_code = item["name"]
		warehouse = item["default_warehouse"]
		out.append(
			{
				"item_code": item_code,
				"item_name": item.get("item_name") or item_code,
				"item_category": item.get("item_category"),
				"food_type": item.get("food_type"),
				"kitchen_station": item.get("kitchen_station"),
				"image": item.get("image"),
				"rate": flt(get_effective_item_rate(item_code, posting_date=posting_date)),
				"warehouse": warehouse,
				"available_qty": flt(qty_map.get((item_code, warehouse), 0.0)),
			}
		)

	return out


@frappe.whitelist()
def create_pos_order(
	*,
	items: object,
	order_type: str,
	billing_mode: str = "Pay Later",
	table_no: str | None = None,
	customer: str | None = None,
	customer_name: str | None = None,
	mobile_no: str | None = None,
	discount_percentage: float = 0,
	service_charge: float = 0,
	payment_method: str | None = None,
	payment_amount: float = 0,
	remarks: str | None = None,
	posting_date: str | None = None,
) -> dict:
	"""Create a restaurant POS Order and optionally bill it immediately."""
	if order_type not in ("Dine-In", "Takeaway"):
		frappe.throw(frappe._("Order type must be Dine-In or Takeaway"))
	if billing_mode not in ("Pay Now", "Pay Later"):
		frappe.throw(frappe._("Billing mode must be Pay Now or Pay Later"))
	if billing_mode == "Pay Now" and payment_method not in VALID_PAYMENT_METHODS:
		frappe.throw(frappe._("Select a valid payment method"))

	posting_date = posting_date or frappe.utils.nowdate()
	resolved_cart = _resolve_cart(items, posting_date)
	discount_percentage = flt(discount_percentage or 0)
	service_charge = flt(service_charge or 0)
	if discount_percentage < 0 or discount_percentage > 100:
		frappe.throw(frappe._("Discount Percentage must be between 0 and 100"))
	if order_type != "Dine-In":
		service_charge = 0

	totals = _calculate_totals(resolved_cart, discount_percentage, service_charge)
	order = frappe.new_doc("POS Order")
	order.posting_date = posting_date
	order.order_type = order_type
	order.billing_mode = billing_mode
	order.payment_status = "Paid" if billing_mode == "Pay Now" else "Unpaid"
	order.table_no = table_no if order_type == "Dine-In" else None
	order.customer = _get_default_customer(customer)
	order.customer_name = customer_name
	order.mobile_no = mobile_no
	order.discount_amount = totals["discount_amount"]
	order.service_charge = service_charge
	order.payment_method = payment_method if billing_mode == "Pay Now" else None
	order.paid_amount = flt(payment_amount or 0) if billing_mode == "Pay Now" else 0
	order.remarks = remarks

	for row in resolved_cart:
		child = order.append("items", {})
		child.item_code = row["item_code"]
		child.qty = row["qty"]
		child.rate = row["rate"]
		child.warehouse = row["warehouse"]
		child.send_to_kitchen = row["send_to_kitchen"]
		child.item_modifications = row["item_modifications"]
		child.kitchen_station = row["kitchen_station"]

	order.insert(ignore_permissions=True)
	order.submit()

	response = {
		"order_name": order.name,
		"takeaway_token": order.takeaway_token,
		"order_status": order.order_status,
		"payment_status": order.payment_status,
		"grand_total": flt(order.grand_total),
	}

	if billing_mode == "Pay Now":
		invoice = _create_invoice_for_pos_order(
			order.name,
			payment_method=payment_method,
			payment_amount=payment_amount,
			mark_paid=True,
		)
		response["invoice_name"] = invoice["invoice_name"]
		response["invoice_number"] = invoice["invoice_number"]

	return response


@frappe.whitelist()
def create_invoice_from_pos_order(
	order_name: str,
	payment_method: str | None = None,
	payment_amount: float | None = None,
	mark_paid: int | bool = 0,
) -> dict:
	"""Generate a bill from an existing POS order, optionally collecting payment."""
	mark_paid = bool(cint(mark_paid))
	if mark_paid and payment_method not in VALID_PAYMENT_METHODS:
		frappe.throw(frappe._("Select a valid payment method"))
	return _create_invoice_for_pos_order(
		order_name,
		payment_method=payment_method,
		payment_amount=payment_amount,
		mark_paid=mark_paid,
	)


@frappe.whitelist()
def create_invoice_with_payment(
	*,
	customer: str | None = None,
	items: object,
	discount_percentage: float = 0,
	payment_method: str,
	payment_amount: float,
	posting_date: str | None = None,
) -> dict:
	"""Backward-compatible direct sale API used by older POS screens."""
	resolved_cart = _resolve_cart(items, posting_date)
	totals = _calculate_totals(resolved_cart, discount_percentage, 0)
	precision = _get_float_precision()
	received = flt(payment_amount or 0)
	if round(received, precision) != round(totals["grand_total"], precision):
		frappe.throw(
			frappe._("Payment amount ({0}) must equal Total ({1})").format(received, totals["grand_total"])
		)

	invoice = frappe.new_doc("Billing Invoice")
	invoice.invoice_number = f"POS-{frappe.utils.nowdate()}-{frappe.generate_hash(length=6)}"
	invoice.posting_date = posting_date or frappe.utils.nowdate()
	invoice.customer = _get_default_customer(customer)
	invoice.discount_percentage = flt(discount_percentage or 0)
	invoice.payment_method = payment_method
	invoice.paid_amount = received

	for row in resolved_cart:
		child = invoice.append("items", {})
		child.item_code = row["item_code"]
		child.qty = row["qty"]
		child.rate = row["rate"]
		child.warehouse = row["warehouse"]

	invoice.insert(ignore_permissions=True)
	invoice.submit()
	frappe.get_attr("billing_management.billing.doctype.billing_invoice.billing_invoice.mark_as_paid")(
		invoice.name
	)
	invoice.reload()

	return {
		"invoice_name": invoice.name,
		"invoice_number": invoice.invoice_number,
		"status": invoice.status,
		"subtotal": totals["subtotal"],
		"discount_amount": totals["discount_amount"],
		"grand_total": totals["grand_total"],
	}


@frappe.whitelist()
def add_stock_for_item(
	*,
	item_code: str,
	qty: float,
	warehouse: str | None = None,
	posting_date: str | None = None,
) -> dict:
	"""Quick stock increase API for POS screen."""
	if not item_code:
		frappe.throw(frappe._("Item is required"))

	qty = flt(qty)
	if qty <= 0:
		frappe.throw(frappe._("Quantity must be greater than 0"))

	item = frappe.get_doc("Billing Item", item_code)
	if not item.is_stock_item:
		frappe.throw(frappe._("Item {0} is not marked as a stock item").format(item_code))

	warehouse = warehouse or item.default_warehouse
	if not warehouse:
		frappe.throw(frappe._("Default warehouse is missing for item {0}").format(item_code))

	posting_date = posting_date or frappe.utils.nowdate()
	voucher_no = f"POS-STOCK-{frappe.generate_hash(length=8)}"
	ledger_name = create_and_submit_stock_ledger_entry(
		item=item_code,
		warehouse=warehouse,
		qty=qty,
		transaction_type="In",
		voucher_type="POS Stock Refill",
		voucher_no=voucher_no,
		posting_date=posting_date,
		description=f"POS quick stock refill for {item_code}",
	)
	return {
		"ledger_name": ledger_name,
		"item_code": item_code,
		"warehouse": warehouse,
		"qty_added": qty,
	}
