import frappe
from frappe.utils import cint, flt


def get_current_stock_qty(item: str, warehouse: str, *, exclude_ledger_name: str | None = None) -> float:
	"""Return current stock quantity from submitted `Stock Ledger` entries.

	This is the system of record for available stock.
	"""
	if not item or not warehouse:
		return 0.0

	# `exclude_ledger_name` is used during validation for the ledger entry itself.
	exclude_clause = ""
	params: dict[str, object] = {"item": item, "warehouse": warehouse}
	if exclude_ledger_name:
		exclude_clause = " AND name != %(exclude_ledger_name)s"
		params["exclude_ledger_name"] = exclude_ledger_name

	qty = frappe.db.sql(
		f"""
			SELECT COALESCE(SUM(qty), 0)
			FROM `tabStock Ledger`
			WHERE docstatus = 1
				AND item = %(item)s
				AND warehouse = %(warehouse)s
				{exclude_clause}
		""",
		values=params,
	)
	return flt(qty[0][0] if qty else 0.0)


def assert_sufficient_stock(requirements: dict[tuple[str, str], float]) -> None:
	"""Raise if any `(item, warehouse)` would go negative after reductions.

	`requirements` must contain positive quantities to be reduced.
	"""
	if not requirements:
		return

	precision = cint(frappe.db.get_single_value("System Settings", "float_precision") or 0)

	for (item, warehouse), qty_to_reduce in requirements.items():
		if flt(qty_to_reduce) <= 0:
			continue

		current_qty = get_current_stock_qty(item, warehouse)
		projected_qty = current_qty - flt(qty_to_reduce)
		if round(projected_qty, precision) < 0:
			frappe.throw(
				frappe._(
					"Insufficient stock for {0} in warehouse {1}. Available: {2}, Required: {3}"
				).format(item, warehouse, current_qty, qty_to_reduce)
			)


def create_and_submit_stock_ledger_entry(
	*,
	item: str,
	warehouse: str,
	qty: float,
	transaction_type: str | None = None,
	voucher_type: str,
	voucher_no: str,
	posting_date: str,
	description: str,
) -> str:
	"""Create a submitted `Stock Ledger` entry for a stock movement."""
	if not item or not warehouse:
		frappe.throw(frappe._("Item and Warehouse are required to post stock movement"))

	doc = frappe.new_doc("Stock Ledger")
	doc.item = item
	doc.warehouse = warehouse
	doc.qty = flt(qty)
	if transaction_type:
		doc.transaction_type = transaction_type
	doc.voucher_type = voucher_type
	doc.voucher_no = voucher_no
	doc.posting_date = posting_date
	doc.description = description

	# Respect ledger validations (especially negative stock prevention).
	doc.insert(ignore_permissions=True)
	doc.submit()

	# Log every stock movement centrally for auditing/debugging.
	try:
		logger = frappe.logger("billing_management.stock")
		transaction_type_msg = transaction_type if transaction_type else "-"
		logger.info(
			"Stock Ledger update: item=%s warehouse=%s qty=%s transaction_type=%s voucher=%s:%s",
			item,
			warehouse,
			doc.qty,
			transaction_type_msg,
			voucher_type,
			voucher_no,
		)
	except Exception:
		# Never block the transaction if logging fails.
		pass
	return doc.name

