import frappe  # type: ignore


@frappe.whitelist()
def get_stock_dashboard_data() -> dict[str, int]:
	"""Return stock status counts for the billing dashboard.

	Return keys:
	- total_items
	- low_stock_items (quantity < minimum_stock)
	- out_of_stock_items (quantity == 0)
	"""
	items = frappe.get_all(
		"Billing Item",
		filters={"is_stock_item": 1, "is_active": 1},
		fields=["name", "reorder_level"],
	)
	if not items:
		return {"total_items": 0, "low_stock_items": 0, "out_of_stock_items": 0}

	item_names = tuple(i.name for i in items)
	ledger_rows = frappe.db.sql(
		"""
		SELECT
			item,
			COALESCE(SUM(qty), 0) AS current_qty
		FROM `tabStock Ledger`
		WHERE docstatus = 1
			AND item IN %(items)s
		GROUP BY item
		""",
		{"items": item_names},
		as_dict=True,
	)
	qty_by_item = {row.item: float(row.current_qty or 0) for row in ledger_rows}

	total_items = len(items)
	low_stock_items = 0
	out_of_stock_items = 0

	for item in items:
		minimum_stock = float(getattr(item, "minimum_stock", None) or item.reorder_level or 0)
		current_qty = float(qty_by_item.get(item.name, 0))

		if current_qty == 0:
			out_of_stock_items += 1

		if current_qty < minimum_stock:
			low_stock_items += 1

	return {
		"total_items": int(total_items),
		"low_stock_items": int(low_stock_items),
		"out_of_stock_items": int(out_of_stock_items),
	}


@frappe.whitelist()
def get_dashboard_counts() -> dict[str, int]:
	"""Backward compatible wrapper for existing client script wiring."""
	return get_stock_dashboard_data()

