Hosting-এর directory structure:

```text
/domains/soft.a2technologiesbd.com/
├── private/
│   └── mre/
│       └── .env               # Secret config; public_html-এর বাইরে
└── public_html/
    └── mre/                   # https://soft.a2technologiesbd.com/mre/
        ├── index.html         # dist/index.html
        ├── favicon.svg        # dist/favicon.svg
        ├── assets/            # dist/assets/ (build অনুযায়ী নাম বদলাতে পারে)
        │   ├── index-<hash>.js
        │   └── index-<hash>.css
        └── api/               # backend/api/ থেকে PHP ফাইলগুলো
            ├── bootstrap.php
            ├── auth/
            │   ├── login.php
            │   └── me.php
            ├── products/
            │   └── create.php
            └── customers/
                └── create.php
```

`dist`-এর **ভেতরের সব ফাইল** `public_html/mre/`-এ আপলোড করুন। `backend/api/`-এর PHP ফাইলগুলো `public_html/mre/api/`-এ আপলোড করুন। ফলে login API URL হবে:

```text
https://soft.a2technologiesbd.com/mre/api/auth/login.php
```

API স্বয়ংক্রিয়ভাবে `/domains/soft.a2technologiesbd.com/private/mre/.env` খুঁজবে। Hosting environment-এ `MRE_ENV_PATH` আগে থেকে সেট থাকলে সেটিই ব্যবহার হবে। `.env` ও database schema public folder-এ আপলোড করবেন না; schema hosting-এর database tool দিয়ে একবার import করুন। পুরোনো ডেটাবেজে `backend/database/products.sql` ও `backend/database/customers.sql` একবার করে import করে সংশ্লিষ্ট টেবিল তৈরি করুন। API code পরিবর্তন হলে `backend/api/`-এর সর্বশেষ PHP ফাইলগুলোও পুনরায় আপলোড করুন।
