# Restaurant Billing - SQL Queries and Reports
# This file contains all SQL queries for dashboard metrics and reports

"""
METRICS QUERIES
"""

# 1. Count Orders by Type (Today)
def get_orders_by_type_today():
    """Get count of orders by order type for today"""
    return frappe.db.sql("""
        SELECT 
            order_type,
            COUNT(*) as count
        FROM `tabPOS Order`
        WHERE posting_date = CURDATE()
        AND docstatus = 1
        GROUP BY order_type
    """, as_dict=True)


# 2. Count Orders by Status
def get_orders_by_status():
    """Get count of orders by order status"""
    return frappe.db.sql("""
        SELECT 
            order_status,
            COUNT(*) as count
        FROM `tabPOS Order`
        WHERE docstatus = 1
        GROUP BY order_status
    """, as_dict=True)


# 3. Today's Revenue Summary
def get_today_revenue():
    """Get today's revenue summary"""
    return frappe.db.sql("""
        SELECT 
            COALESCE(SUM(grand_total), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN order_type = 'Dine-In' THEN grand_total ELSE 0 END), 0) as dine_in_revenue,
            COALESCE(SUM(CASE WHEN order_type = 'Takeaway' THEN grand_total ELSE 0 END), 0) as takeaway_revenue,
            COUNT(*) as total_orders
        FROM `tabPOS Order`
        WHERE posting_date = CURDATE()
        AND docstatus = 1
    """, as_dict=True)[0]


# 4. Top Selling Items (Today)
def get_top_selling_items_today(limit=10):
    """Get top selling items for today"""
    return frappe.db.sql("""
        SELECT 
            item.item_code,
            item.item_name,
            SUM(item.qty) as total_qty,
            SUM(item.amount) as total_amount,
            AVG(item.rate) as avg_rate
        FROM `tabPOS Order Item` item
        INNER JOIN `tabPOS Order` `order` ON item.parent = `order`.name
        WHERE `order`.posting_date = CURDATE()
        AND `order`.docstatus = 1
        GROUP BY item.item_code, item.item_name
        ORDER BY total_qty DESC
        LIMIT %s
    """, (limit,), as_dict=True)


# 5. Low Stock Items
def get_low_stock_items():
    """Get items with low stock"""
    return frappe.db.sql("""
        SELECT 
            item.item_code,
            item.item_name,
            item.reorder_level,
            COALESCE(SUM(ledger.qty), 0) as current_stock
        FROM `tabBilling Item` item
        LEFT JOIN `tabStock Ledger` ledger ON item.item_code = ledger.item
        WHERE item.is_active = 1
        AND item.is_stock_item = 1
        AND item.reorder_level > 0
        GROUP BY item.item_code, item.item_name, item.reorder_level
        HAVING current_stock <= item.reorder_level
        ORDER BY current_stock ASC
    """, as_dict=True)


# 6. Table Occupancy Status
def get_table_occupancy():
    """Get current table occupancy status"""
    return frappe.db.sql("""
        SELECT 
            table.name,
            table.table_name,
            table.table_number,
            table.table_type,
            table.zone,
            table.is_available,
            CASE 
                WHEN table.is_available = 1 THEN 'Available'
                ELSE 'Occupied'
            END as status_label
        FROM `tabRestaurant Table` table
        WHERE table.is_active = 1
        ORDER BY table.table_number
    """, as_dict=True)


# 7. Active Orders by Table
def get_active_orders_by_table():
    """Get active orders grouped by table"""
    return frappe.db.sql("""
        SELECT 
            `order`.table_no,
            `order`.name as order_id,
            `order`.grand_total,
            `order`.order_status,
            `order`.posting_time,
            COUNT(`order`.name) as order_count
        FROM `tabPOS Order` `order`
        WHERE `order`.order_type = 'Dine-In'
        AND `order`.order_status IN ('Pending', 'Preparing', 'Ready')
        AND `order`.docstatus = 1
        GROUP BY `order`.table_no, `order`.name
        ORDER BY `order`.posting_time DESC
    """, as_dict=True)


# 8. Kitchen Orders Pending
def get_kitchen_pending_orders():
    """Get orders pending in kitchen"""
    return frappe.db.sql("""
        SELECT 
            `order`.name,
            `order`.table_no,
            `order`.takeaway_token,
            `order`.order_type,
            `order`.kitchen_status,
            `order`.posting_time,
            COUNT(item.name) as item_count
        FROM `tabPOS Order` `order`
        INNER JOIN `tabPOS Order Item` item ON `order`.name = item.parent
        WHERE `order`.kitchen_status IN ('Pending', 'In Progress', 'Ready')
        AND `order`.docstatus = 1
        GROUP BY `order`.name
        ORDER BY `order`.posting_time ASC
    """, as_dict=True)


# 9. Hourly Order Summary (Today)
def get_hourly_order_summary():
    """Get hourly order summary for today"""
    return frappe.db.sql("""
        SELECT 
            HOUR(posting_time) as hour,
            COUNT(*) as order_count,
            SUM(grand_total) as revenue
        FROM `tabPOS Order`
        WHERE posting_date = CURDATE()
        AND docstatus = 1
        GROUP BY HOUR(posting_time)
        ORDER BY hour ASC
    """, as_dict=True)


# 10. Daily Revenue Summary (Last 7 Days)
def get_daily_revenue_last_7_days():
    """Get daily revenue summary for last 7 days"""
    return frappe.db.sql("""
        SELECT 
            posting_date,
            COUNT(*) as order_count,
            SUM(grand_total) as total_revenue,
            SUM(CASE WHEN order_type = 'Dine-In' THEN grand_total ELSE 0 END) as dine_in_revenue,
            SUM(CASE WHEN order_type = 'Takeaway' THEN grand_total ELSE 0 END) as takeaway_revenue
        FROM `tabPOS Order`
        WHERE posting_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND docstatus = 1
        GROUP BY posting_date
        ORDER BY posting_date DESC
    """, as_dict=True)


# 11. Customer Order History
def get_customer_order_history(customer_name=None, limit=10):
    """Get customer order history"""
    filters = {'docstatus': 1}
    if customer_name:
        filters['customer_name'] = ['like', f'%{customer_name}%']
    
    return frappe.db.sql("""
        SELECT 
            `order`.name,
            `order`.customer_name,
            `order`.order_type,
            `order`.grand_total,
            `order`.posting_date,
            `order`.order_status
        FROM `tabPOS Order` `order`
        WHERE `order`.docstatus = 1
        {customer_filter}
        ORDER BY `order`.posting_date DESC
        LIMIT %s
    """.format(customer_filter="AND `order`.customer_name LIKE %s" if customer_name else ""), 
    (f'%{customer_name}%', limit) if customer_name else (limit,), as_dict=True)


# 12. Item-wise Sales Report (Date Range)
def get_item_sales_report(from_date, to_date):
    """Get item-wise sales report for date range"""
    return frappe.db.sql("""
        SELECT 
            item.item_code,
            item.item_name,
            item.item_category,
            item.food_type,
            SUM(item.qty) as total_qty,
            SUM(item.amount) as total_amount,
            COUNT(DISTINCT item.parent) as order_count
        FROM `tabPOS Order Item` item
        INNER JOIN `tabPOS Order` `order` ON item.parent = `order`.name
        WHERE `order`.posting_date BETWEEN %s AND %s
        AND `order`.docstatus = 1
        GROUP BY item.item_code, item.item_name, item.item_category, item.food_type
        ORDER BY total_amount DESC
    """, (from_date, to_date), as_dict=True)


# 13. Payment Method Summary
def get_payment_method_summary(from_date=None, to_date=None):
    """Get payment method summary"""
    query = """
        SELECT 
            payment_method,
            COUNT(*) as count,
            SUM(grand_total) as total_amount,
            SUM(paid_amount) as total_paid
        FROM `tabPOS Order`
        WHERE docstatus = 1
    """
    
    if from_date and to_date:
        query += " AND posting_date BETWEEN %s AND %s"
        return frappe.db.sql(query + " GROUP BY payment_method ORDER BY total_amount DESC", 
                           (from_date, to_date), as_dict=True)
    
    return frappe.db.sql(query + " GROUP BY payment_method ORDER BY total_amount DESC", as_dict=True)


# 14. Average Order Value
def get_average_order_value(period='today'):
    """Get average order value"""
    if period == 'today':
        where_clause = "posting_date = CURDATE()"
    elif period == 'week':
        where_clause = "posting_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
    elif period == 'month':
        where_clause = "posting_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    else:
        where_clause = "posting_date = CURDATE()"
    
    return frappe.db.sql(f"""
        SELECT 
            AVG(grand_total) as avg_order_value,
            MIN(grand_total) as min_order_value,
            MAX(grand_total) as max_order_value
        FROM `tabPOS Order`
        WHERE {where_clause}
        AND docstatus = 1
    """, as_dict=True)[0]


# 15. Cancelled Orders Report
def get_cancelled_orders(from_date=None, to_date=None):
    """Get cancelled orders report"""
    query = """
        SELECT 
            name,
            order_type,
            table_no,
            takeaway_token,
            grand_total,
            posting_date,
            posting_time,
            remarks
        FROM `tabPOS Order`
        WHERE docstatus = 2
    """
    
    if from_date and to_date:
        query += " AND posting_date BETWEEN %s AND %s"
        return frappe.db.sql(query + " ORDER BY posting_date DESC", (from_date, to_date), as_dict=True)
    
    return frappe.db.sql(query + " ORDER BY posting_date DESC", as_dict=True)


"""
UTILITY FUNCTIONS
"""

def get_fiscal_year_orders():
    """Get orders for current fiscal year"""
    fiscal_year = frappe.defaults.get_user_default("fiscal_year")
    if fiscal_year:
        fy = frappe.get_doc("Fiscal Year", fiscal_year)
        return frappe.db.sql("""
            SELECT 
                COUNT(*) as total_orders,
                SUM(grand_total) as total_revenue
            FROM `tabPOS Order`
            WHERE posting_date BETWEEN %s AND %s
            AND docstatus = 1
        """, (fy.year_start_date, fy.year_end_date), as_dict=True)[0]
    return None


def get_monthly_targets_comparison(target_revenue):
    """Compare monthly revenue against target"""
    current_month_revenue = frappe.db.sql("""
        SELECT SUM(grand_total) as revenue
        FROM `tabPOS Order`
        WHERE MONTH(posting_date) = MONTH(CURDATE())
        AND YEAR(posting_date) = YEAR(CURDATE())
        AND docstatus = 1
    """, as_dict=True)[0].revenue or 0
    
    return {
        'target': target_revenue,
        'achieved': current_month_revenue,
        'percentage': (current_month_revenue / target_revenue * 100) if target_revenue > 0 else 0,
        'remaining': target_revenue - current_month_revenue
    }
