# Sale and Sale Order action footer

Sale Create/Edit and Sale Order Create/Edit use the shared
`VoucherSubmitFooter` component. The form body remains a normal scroll view,
while the footer stays below it and includes the current final amount, mutation
error, and Create or Update button.

The scroll view has bottom padding so its summary cannot be obscured by the
fixed footer. The footer receives the existing action callback, validation
disabled state, mutation pending state, and backend error text; it does not
change payload construction or save rules.

## References

- `frontend/src/pages/sales/SaleOrderCreatePage.jsx`
- `frontend/src/pages/sales/SaleOrderEditPage.jsx`
- `backend/services/sale.service.js`
- `backend/services/saleOrder.service.js`
