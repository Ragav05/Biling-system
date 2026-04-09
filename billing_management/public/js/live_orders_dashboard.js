// Add a Live Orders shortcut to the billing stock dashboard.
frappe.pages["billing-stock-dashboard"].on_page_load = function (wrapper) {
	const addLiveOrdersButton = () => {
		const $wrapper = $(wrapper);
		const $posButton = $wrapper.find('.btn:contains("Open POS Billing")').first();

		if (!$posButton.length || $wrapper.find(".billing-live-orders-btn").length) {
			return;
		}

		const $liveOrdersButton = $(
			`<button class="btn btn-primary btn-sm billing-live-orders-btn">
				<svg class="icon icon-sm"><use href="#icon-pos"></use></svg>
				<span>${__("Live Orders")}</span>
			</button>`
		);

		$liveOrdersButton.on("click", () => frappe.set_route("live-orders"));
		$posButton.parent().prepend($liveOrdersButton);
	};

	// The stock dashboard renders its toolbar after page load.
	setTimeout(addLiveOrdersButton, 1000);
};
