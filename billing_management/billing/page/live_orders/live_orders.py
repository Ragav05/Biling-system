import frappe
from frappe.utils import now_datetime, get_datetime


ACTIVE_ORDER_STATUSES = ("Pending", "Preparing", "Ready")
ACTIVE_KITCHEN_STATUSES = ("Pending", "In Progress", "Ready")


@frappe.whitelist()
def get_live_orders_data(order_type=None, payment_status=None):
	"""Return restaurant operations data sourced from POS Order."""
	filters = {"docstatus": 1, "order_status": ["in", list(ACTIVE_ORDER_STATUSES)]}
	if order_type and order_type in ("Dine-In", "Takeaway"):
		filters["order_type"] = order_type
	if payment_status and payment_status in ("Unpaid", "Paid"):
		filters["payment_status"] = payment_status

	orders = frappe.get_all(
		"POS Order",
		filters=filters,
		fields=[
			"name",
			"table_no",
			"takeaway_token",
			"order_type",
			"billing_mode",
			"payment_status",
			"billing_invoice",
			"kitchen_status",
			"order_status",
			"grand_total",
			"posting_date",
			"posting_time",
			"customer_name",
			"remarks",
		],
		order_by="posting_date desc, posting_time desc",
	)

	for order in orders:
		order.items = frappe.get_all(
			"POS Order Item",
			filters={"parent": order.name},
			fields=["item_name", "qty", "item_modifications", "kitchen_status"],
		)
		posted_at = get_datetime(f"{order.posting_date} {order.posting_time}")
		order.elapsed_minutes = max(int((now_datetime() - posted_at).total_seconds() // 60), 0)

	tables = frappe.get_all(
		"Restaurant Table",
		filters={"is_active": 1},
		fields=["name", "table_name", "table_number", "table_type", "zone", "is_available", "max_capacity"],
		order_by="table_number asc",
	)

	stats = {
		"active_orders": len(orders),
		"pending_kitchen": len([o for o in orders if o.kitchen_status in ("Pending", "In Progress")]),
		"ready_orders": len([o for o in orders if o.order_status == "Ready" or o.kitchen_status == "Ready"]),
		"occupied_tables": len([t for t in tables if not t.is_available]),
		"unpaid_orders": len([o for o in orders if o.payment_status == "Unpaid"]),
		"takeaway_orders": len([o for o in orders if o.order_type == "Takeaway"]),
	}

	return {"orders": orders, "tables": tables, "stats": stats}


@frappe.whitelist()
def update_order_status(order_name, status=None):
	"""Update operational and kitchen status in one place."""
	order = frappe.get_doc("POS Order", order_name)
	if not status:
		frappe.throw("Status is required")

	kitchen_status = None
	if status == "Preparing":
		kitchen_status = "In Progress"
	elif status == "Ready":
		kitchen_status = "Ready"
	elif status == "Served":
		kitchen_status = "Served"
	elif status == "Picked Up":
		kitchen_status = "Served"

	updates = {"order_status": status}
	if kitchen_status:
		updates["kitchen_status"] = kitchen_status
	frappe.db.set_value("POS Order", order.name, updates, update_modified=False)

	if status in ("Served", "Picked Up") and order.order_type == "Dine-In" and order.table_no:
		frappe.db.set_value("Restaurant Table", order.table_no, "is_available", 1, update_modified=False)

	frappe.db.commit()
	return {"success": True}


@frappe.whitelist()
def create_bill(order_name, payment_method=None, payment_amount=None, mark_paid=0):
	"""Create or settle a bill from the live orders dashboard."""
	return frappe.get_attr("billing_management.billing.pos.billing_pos.create_invoice_from_pos_order")(
		order_name=order_name,
		payment_method=payment_method,
		payment_amount=payment_amount,
		mark_paid=mark_paid,
	)
