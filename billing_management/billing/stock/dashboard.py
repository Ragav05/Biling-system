import frappe  # type: ignore


def _get_stock_snapshot() -> list[dict]:
	items = frappe.get_all(
		"Billing Item",
		filters={"is_stock_item": 1, "is_active": 1},
		fields=["name", "item_code", "item_name", "reorder_level"],
	)
	if not items:
		return []

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

	snapshot = []
	for item in items:
		minimum_stock = float(getattr(item, "minimum_stock", None) or item.reorder_level or 0)
		current_qty = float(qty_by_item.get(item.name, 0))
		snapshot.append(
			{
				"name": item.name,
				"item_code": item.item_code,
				"item_name": item.item_name,
				"minimum_stock": minimum_stock,
				"current_qty": current_qty,
			}
		)

	return snapshot


@frappe.whitelist()
def get_stock_dashboard_data() -> dict[str, int]:
	"""Return stock status counts for the billing dashboard.

	Return keys:
	- total_items
	- low_stock_items (quantity < minimum_stock)
	- out_of_stock_items (quantity == 0)
	"""
	items = _get_stock_snapshot()
	if not items:
		return {"total_items": 0, "low_stock_items": 0, "out_of_stock_items": 0}

	total_items = len(items)
	low_stock_items = 0
	out_of_stock_items = 0

	for item in items:
		if item["current_qty"] == 0:
			out_of_stock_items += 1

		if item["current_qty"] < item["minimum_stock"]:
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


@frappe.whitelist()
def get_stock_items_by_status(status: str) -> list[str]:
	"""Return Billing Item names matching the requested stock status."""
	status = (status or "").strip().lower()
	if status not in {"low_stock", "out_of_stock"}:
		frappe.throw(frappe._("Unsupported stock status: {0}").format(status))

	items = _get_stock_snapshot()
	if status == "out_of_stock":
		return [item["name"] for item in items if item["current_qty"] == 0]

	return [item["name"] for item in items if item["current_qty"] < item["minimum_stock"]]
