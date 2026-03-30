// Add Live Orders button to Billing Stock Dashboard
frappe.pages['billing-stock-dashboard'].on_page_load = function(wrapper) {
    // Wait for the page to fully load
    setTimeout(function() {
        // Find the action area and add Live Orders button
        var $live_orders_btn = $('<button class="btn btn-primary btn-sm" onclick="frappe.set_route(\'live-orders\')">
            <svg class="icon icon-sm"><use href="#icon-pos"></use></svg>
            🍽️ Live Orders
        </button>');
        
        // Find the button container and prepend our button
        var $btn_container = $(wrapper).find('.btn:contains("Open POS Billing")').parent();
        if ($btn_container.length) {
            $btn_container.prepend($live_orders_btn);
        }
    }, 1000);
};
