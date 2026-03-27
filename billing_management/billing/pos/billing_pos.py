from __future__ import annotations

import frappe
from frappe.utils import cint, flt


def _get_float_precision() -> int:
	return cint(frappe.db.get_single_value("System Settings", "float_precision") or 0)


@frappe.whitelist()
def get_pos_items(search: str | None = None, limit: int = 100) -> list[dict]:
	"""Return POS items with current available qty in each Billing Item's default warehouse.

	Used by `public/js/billing_dashboard.js`.
	"""
	filters: list = [["is_stock_item", "=", 1], ["is_active", "=", 1]]
	if search:
		# Basic search on item_code and item_name
		search_like = f"%{search.strip()}%"
		filters = filters + [["name", "like", search_like]]

	limit = max(1, min(int(limit or 100), 200))

	items = frappe.get_all(
		"Billing Item",
		fields=["name", "item_name", "default_rate", "default_warehouse"],
		filters=filters,
		limit_page_length=limit,
	)
	# Filter items without warehouse (required for stock validation)
	items = [i for i in items if i.get("default_warehouse")]

	if not items:
		return []

	item_codes = tuple(i["name"] for i in items)
	warehouses = tuple(set(i["default_warehouse"] for i in items if i.get("default_warehouse")))

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
	qty_map: dict[tuple[str, str], float] = {}
	for row in ledger_rows:
		qty_map[(row.item, row.warehouse)] = float(row.current_qty or 0)

	out: list[dict] = []
	for i in items:
		item_code = i["name"]
		warehouse = i["default_warehouse"]
		out.append(
			{
				"item_code": item_code,
				"item_name": i.get("item_name") or item_code,
				"rate": flt(i.get("default_rate") or 0),
				"warehouse": warehouse,
				"available_qty": flt(qty_map.get((item_code, warehouse), 0.0)),
			}
		)

	return out


@frappe.whitelist()
def create_invoice_with_payment(
	*,
	customer: str | None = None,
	items: list[dict],
	discount_percentage: float = 0,
	payment_method: str,
	payment_amount: float,
	posting_date: str | None = None,
) -> dict:
	"""Create a Billing Invoice from POS cart and mark it Paid after stock reduction.

	Expected payload:
	- items: [{item_code, qty, rate?}]
	- discount_percentage: number
	- payment_method: "Cash" | "Card"
	- payment_amount: number (must match grand_total)
	"""
	if payment_method not in ("Cash", "Card"):
		frappe.throw(frappe._("Invalid payment method"))

	if not items:
		frappe.throw(frappe._("Cart cannot be empty"))

	precision = _get_float_precision()
	discount_percentage = flt(discount_percentage or 0)
	payment_amount = flt(payment_amount or 0)

	if discount_percentage < 0 or discount_percentage > 100:
		frappe.throw(frappe._("Discount Percentage must be between 0 and 100"))

	posting_date = posting_date or frappe.utils.nowdate()

	# Fetch Billing Items in one query
	item_codes = tuple({i.get("item_code") for i in items if i.get("item_code")})
	if not item_codes:
		frappe.throw(frappe._("Cart items must have item_code"))

	billing_items = frappe.get_all(
		"Billing Item",
		fields=["name", "item_name", "is_stock_item", "default_warehouse", "default_rate"],
		filters={"name": ["in", item_codes]},
	)
	item_map = {bi["name"]: bi for bi in billing_items}

	resolved_cart: list[dict] = []
	for row in items:
		item_code = row.get("item_code")
		if not item_code:
			continue
		if item_code not in item_map:
			frappe.throw(frappe._("Unknown Billing Item: {0}").format(item_code))
		item = item_map[item_code]
		qty = flt(row.get("qty") or 0)
		if qty <= 0:
			frappe.throw(frappe._("Quantity must be greater than 0 for {0}").format(item_code))

		if not item.get("is_stock_item"):
			frappe.throw(frappe._("Item {0} is not marked as a stock item").format(item_code))

		rate = row.get("rate", None)
		if rate is None or rate == "" or flt(rate) == 0:
			rate = item.get("default_rate") or 0

		warehouse = item.get("default_warehouse")
		if not warehouse:
			frappe.throw(frappe._("Default warehouse is required for item {0}").format(item_code))

		resolved_cart.append(
			{
				"item_code": item_code,
				"qty": qty,
				"rate": flt(rate),
				"warehouse": warehouse,
			}
		)

	if not resolved_cart:
		frappe.throw(frappe._("Cart must contain at least one valid item"))

	subtotal = sum(flt(r["qty"]) * flt(r["rate"]) for r in resolved_cart)
	discount_amount = flt(round(subtotal * discount_percentage / 100, precision))
	grand_total = flt(round(subtotal - discount_amount, precision))

	if grand_total < 0:
		frappe.throw(frappe._("Grand total cannot be negative"))

	if round(payment_amount, precision) != round(grand_total, precision):
		frappe.throw(
			frappe._("Payment amount ({0}) must equal Total ({1})").format(payment_amount, grand_total)
		)

	# Create invoice
	invoice_number = f"POS-{frappe.utils.nowdate()}-{frappe.generate_hash(length=6)}"

	doc = frappe.new_doc("Billing Invoice")
	doc.invoice_number = invoice_number
	doc.posting_date = posting_date
	if customer:
		doc.customer = customer
	doc.discount_percentage = discount_percentage

	for r in resolved_cart:
		child = doc.append("items", {})
		child.item_code = r["item_code"]
		child.qty = r["qty"]
		child.rate = r["rate"]
		child.warehouse = r["warehouse"]

	# Save and submit (stock reduction happens on submit)
	doc.insert(ignore_permissions=True)
	doc.submit()

	# Mark paid (status Paid)
	doc = frappe.get_doc("Billing Invoice", doc.name)
	if doc.status != "Paid":
		frappe.call("billing_management.billing.doctype.billing_invoice.billing_invoice.mark_as_paid", invoice_name=doc.name)

	return {
		"invoice_name": doc.name,
		"invoice_number": doc.invoice_number,
		"status": frappe.db.get_value("Billing Invoice", doc.name, "status"),
		"subtotal": flt(round(subtotal, precision)),
		"discount_amount": discount_amount,
		"grand_total": grand_total,
	}

