from __future__ import annotations

import frappe  # type: ignore
from frappe.utils import flt, getdate, nowdate  # type: ignore


def get_effective_item_rate(item_code: str, *, posting_date: str | None = None) -> float:
	"""Return best effective rate for item on given date.

	Priority:
	1) latest `Billing Item Rate` row with `rate_date <= posting_date`
	2) latest available `Billing Item Rate` row
	3) `Billing Item.default_rate`
	"""
	if not item_code:
		return 0.0

	posting_date = posting_date or nowdate()
	target_date = getdate(posting_date)

	price_rows = frappe.get_all(
		"Billing Item Rate",
		fields=["rate_date", "rate"],
		filters={"parent": item_code, "parenttype": "Billing Item", "parentfield": "price_history"},
		order_by="rate_date desc",
		limit_page_length=200,
	)

	for row in price_rows:
		if row.get("rate_date") and getdate(row["rate_date"]) <= target_date:
			return flt(row.get("rate") or 0)

	if price_rows:
		return flt(price_rows[0].get("rate") or 0)

	return flt(frappe.db.get_value("Billing Item", item_code, "default_rate") or 0)


@frappe.whitelist()
def get_item_rate(item_code: str, posting_date: str | None = None) -> dict[str, float | str]:
	"""Whitelisted helper for form/pos client scripts."""
	rate = get_effective_item_rate(item_code, posting_date=posting_date)
	return {"item_code": item_code, "rate": flt(rate), "posting_date": posting_date or nowdate()}

