from datetime import timedelta

import frappe
from frappe.utils import flt, nowdate, add_days, getdate, now_datetime


@frappe.whitelist()
def get_overview(range_days=7):
	"""Aggregate KPIs, charts and recent activity for the analytics dashboard."""
	range_days = max(int(range_days or 7), 1)
	today = nowdate()
	start_date = add_days(today, -(range_days - 1))

	return {
		"kpis": _get_kpis(today, start_date),
		"hourly_sales": _get_hourly_sales(today),
		"range_sales": _get_range_sales(start_date, today),
		"top_items": _get_top_items(start_date, today),
		"payment_breakdown": _get_payment_breakdown(today),
		"order_mix": _get_order_mix(start_date, today),
		"kitchen_load": _get_kitchen_load(),
		"low_stock": _get_low_stock(),
		"recent_orders": _get_recent_orders(limit=8),
		"generated_at": now_datetime().isoformat(),
		"range_days": range_days,
	}


def _get_kpis(today, start_date):
	# Revenue = submitted POS Pay-Now + submitted invoices (today)
	today_revenue = flt(frappe.db.sql(
		"""
		SELECT COALESCE(SUM(grand_total), 0) FROM `tabPOS Order`
		WHERE docstatus = 1 AND billing_mode = 'Pay Now' AND posting_date = %s
		""",
		today,
	)[0][0]) + flt(frappe.db.sql(
		"""
		SELECT COALESCE(SUM(grand_total), 0) FROM `tabBilling Invoice`
		WHERE docstatus = 1 AND posting_date = %s
		""",
		today,
	)[0][0])

	today_orders = frappe.db.count("POS Order", {"docstatus": 1, "posting_date": today})
	range_orders = frappe.db.count(
		"POS Order",
		{"docstatus": 1, "posting_date": ["between", [start_date, today]]},
	)
	range_revenue = flt(frappe.db.sql(
		"""
		SELECT COALESCE(SUM(grand_total), 0) FROM `tabPOS Order`
		WHERE docstatus = 1 AND posting_date BETWEEN %s AND %s
		""",
		(start_date, today),
	)[0][0])

	active_orders = frappe.db.count(
		"POS Order",
		{"docstatus": 1, "order_status": ["in", ("Pending", "Preparing", "Ready", "Served")]},
	)
	unpaid_orders = frappe.db.count(
		"POS Order",
		{"docstatus": 1, "payment_status": "Unpaid"},
	)
	kitchen_queue = frappe.db.count(
		"POS Order",
		{"docstatus": 1, "kitchen_status": ["in", ("Pending", "In Progress")]},
	)
	tables_total = frappe.db.count("Restaurant Table", {"is_active": 1})
	tables_available = frappe.db.count("Restaurant Table", {"is_active": 1, "is_available": 1})

	avg_ticket = (range_revenue / range_orders) if range_orders else 0

	return {
		"today_revenue": today_revenue,
		"today_orders": today_orders,
		"avg_ticket": avg_ticket,
		"range_revenue": range_revenue,
		"range_orders": range_orders,
		"active_orders": active_orders,
		"unpaid_orders": unpaid_orders,
		"kitchen_queue": kitchen_queue,
		"tables_total": tables_total,
		"tables_available": tables_available,
		"tables_occupied": tables_total - tables_available,
	}


def _get_hourly_sales(today):
	rows = frappe.db.sql(
		"""
		SELECT HOUR(posting_time) AS hr, COALESCE(SUM(grand_total), 0) AS total, COUNT(*) AS orders
		FROM `tabPOS Order`
		WHERE docstatus = 1 AND posting_date = %s
		GROUP BY HOUR(posting_time)
		""",
		today,
		as_dict=True,
	)
	by_hour = {int(r.hr or 0): r for r in rows}
	labels, revenue, orders = [], [], []
	for h in range(8, 24):  # restaurant hours 8am - 11pm
		labels.append(f"{h:02d}:00")
		row = by_hour.get(h)
		revenue.append(flt(row.total) if row else 0)
		orders.append(int(row.orders) if row else 0)
	return {"labels": labels, "revenue": revenue, "orders": orders}


def _get_range_sales(start_date, today):
	rows = frappe.db.sql(
		"""
		SELECT posting_date AS d,
			COALESCE(SUM(grand_total), 0) AS total,
			COUNT(*) AS orders
		FROM `tabPOS Order`
		WHERE docstatus = 1 AND posting_date BETWEEN %s AND %s
		GROUP BY posting_date
		ORDER BY posting_date ASC
		""",
		(start_date, today),
		as_dict=True,
	)
	by_date = {str(r.d): r for r in rows}
	labels, revenue, orders = [], [], []
	cur = getdate(start_date)
	end = getdate(today)
	while cur <= end:
		key = str(cur)
		row = by_date.get(key)
		labels.append(cur.strftime("%d %b"))
		revenue.append(flt(row.total) if row else 0)
		orders.append(int(row.orders) if row else 0)
		cur = cur + timedelta(days=1)
	return {"labels": labels, "revenue": revenue, "orders": orders}


def _get_top_items(start_date, today):
	rows = frappe.db.sql(
		"""
		SELECT poi.item_code AS item,
			poi.item_name AS item_name,
			SUM(poi.qty) AS qty,
			SUM(poi.amount) AS amount
		FROM `tabPOS Order Item` poi
		INNER JOIN `tabPOS Order` po ON po.name = poi.parent
		WHERE po.docstatus = 1 AND po.posting_date BETWEEN %s AND %s
		GROUP BY poi.item_code, poi.item_name
		ORDER BY amount DESC
		LIMIT 6
		""",
		(start_date, today),
		as_dict=True,
	)
	return rows or []


def _get_payment_breakdown(today):
	rows = frappe.db.sql(
		"""
		SELECT payment_method, COUNT(*) AS orders, COALESCE(SUM(grand_total), 0) AS total
		FROM `tabPOS Order`
		WHERE docstatus = 1 AND billing_mode = 'Pay Now'
			AND posting_date = %s AND payment_method IS NOT NULL AND payment_method != ''
		GROUP BY payment_method
		""",
		today,
		as_dict=True,
	)
	inv_rows = frappe.db.sql(
		"""
		SELECT payment_method, COUNT(*) AS orders, COALESCE(SUM(grand_total), 0) AS total
		FROM `tabBilling Invoice`
		WHERE docstatus = 1 AND posting_date = %s
			AND payment_method IS NOT NULL AND payment_method != ''
		GROUP BY payment_method
		""",
		today,
		as_dict=True,
	)
	merged = {}
	for r in rows + inv_rows:
		key = r.payment_method or "Unknown"
		entry = merged.setdefault(key, {"payment_method": key, "orders": 0, "total": 0})
		entry["orders"] += int(r.orders or 0)
		entry["total"] += flt(r.total)
	return sorted(merged.values(), key=lambda x: x["total"], reverse=True)


def _get_order_mix(start_date, today):
	rows = frappe.db.sql(
		"""
		SELECT order_type, COUNT(*) AS orders, COALESCE(SUM(grand_total), 0) AS total
		FROM `tabPOS Order`
		WHERE docstatus = 1 AND posting_date BETWEEN %s AND %s
		GROUP BY order_type
		""",
		(start_date, today),
		as_dict=True,
	)
	return rows or []


def _get_kitchen_load():
	rows = frappe.db.sql(
		"""
		SELECT ks.name AS station, ks.station_name AS label,
			COALESCE(SUM(CASE WHEN poi.kitchen_status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END), 0) AS pending
		FROM `tabKitchen Station` ks
		LEFT JOIN `tabBilling Item` bi ON bi.kitchen_station = ks.name
		LEFT JOIN `tabPOS Order Item` poi ON poi.item_code = bi.name
		LEFT JOIN `tabPOS Order` po ON po.name = poi.parent AND po.docstatus = 1
			AND po.order_status IN ('Pending', 'Preparing')
		WHERE ks.is_active = 1
		GROUP BY ks.name, ks.station_name
		ORDER BY pending DESC
		""",
		as_dict=True,
	)
	return rows or []


def _get_low_stock():
	rows = frappe.db.sql(
		"""
		SELECT bi.name AS item, bi.item_name AS item_name,
			bi.reorder_level AS reorder_level,
			COALESCE((
				SELECT sl.balance_qty FROM `tabStock Ledger` sl
				WHERE sl.item = bi.name
				ORDER BY sl.posting_date DESC, sl.posting_time DESC, sl.creation DESC
				LIMIT 1
			), 0) AS balance_qty
		FROM `tabBilling Item` bi
		WHERE bi.is_stock_item = 1 AND bi.is_active = 1
		HAVING balance_qty <= reorder_level AND reorder_level > 0
		ORDER BY (reorder_level - balance_qty) DESC
		LIMIT 10
		""",
		as_dict=True,
	)
	return rows or []


def _get_recent_orders(limit=8):
	return frappe.get_all(
		"POS Order",
		filters={"docstatus": 1},
		fields=[
			"name",
			"customer_name",
			"order_type",
			"order_status",
			"payment_status",
			"grand_total",
			"posting_date",
			"posting_time",
			"table_no",
		],
		order_by="posting_date desc, posting_time desc",
		limit=limit,
	)
