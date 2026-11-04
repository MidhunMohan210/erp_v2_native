# Offline Master Download Flow

Each downloaded master has the same three files in its own folder:

| File | What it does |
| --- | --- |
| `*MasterRepository.ts` | Talks to SQLite. It validates rows, replaces one company's data inside a transaction, lists rows, and counts rows. |
| `*MasterImport.service.ts` | Controls the download flow. It calls the downloader, validates the complete response, asks the repository to save it, then saves completion metadata. |
| `*MasterDownloadMetadata.service.ts` | Saves a small receipt in AsyncStorage: company ID, downloaded count or counts, and completion time. It does not store the master records. |

The API call itself is kept separately in `src/offline/downloads/`. For example, Product Filters use `productFilterMasterDownload.service.ts`. This keeps HTTP code outside SQLite code.

## Starting point

The user starts at `src/app/settings-offline-data.tsx`:

1. The screen opens and checks every master with its `get...DownloadStatus` function.
2. The status function compares SQLite row counts with the saved metadata receipt.
3. The screen shows **Download** when no complete receipt exists, or **Update** when the saved data is complete.
4. When the user presses the button, the screen calls that master's `import...Master` function.

## Download flow

```text
Settings → Offline Data
        ↓
import...Master(userId, companyId)
        ↓
download service calls the backend API
        ↓
validate the complete downloaded list
        ↓
repository starts one SQLite transaction
        ↓
delete only this company's old master rows
        ↓
insert every new row
        ↓
SQLite transaction commits
        ↓
save metadata receipt in AsyncStorage
        ↓
screen shows saved count and 100%
```

If the API response is invalid, a duplicate is found, a relationship is invalid, or SQLite insertion fails, the transaction rolls back. The previous successful data remains in SQLite and no new completion receipt is saved.

## Why metadata is needed

The row count alone cannot prove a download completed. A company can validly have zero Price Levels, zero Additional Charges, or zero Product Filters. The metadata receipt proves that the app successfully received and saved the complete response, even when its count is `0`.

## Master-specific notes

| Master | Folder | Important rule |
| --- | --- | --- |
| Parties | `party/` | Replaces only server-downloaded rows and keeps future pending device rows separate. |
| Products | `product/` | Keeps full Product JSON as the downloaded baseline, including pricing and stock data. |
| Price Levels | `priceLevel/` | Stores selectable Price Level IDs and names; Product `priceLevels[]` remains unchanged. |
| Voucher Series | `voucherSeries/` | Stores preview-only current numbers. The backend still assigns final voucher numbers. |
| Additional Charges | `additionalCharge/` | Stores master identity and tax rates, not voucher-specific values or totals. |
| Product Filters | `productFilter/` | Downloads Brands, Categories, and Subcategories together. Every Subcategory must reference a downloaded Category. |

## Company and user isolation

- SQLite records always include the selected `company_id` (or Party `cmp_id`).
- Replacements delete only the selected company's records.
- The encrypted SQLite database is opened for the signed-in user.
- Metadata keys include both user ID and company ID.

This means downloading a master for one company does not replace another company's local data.
