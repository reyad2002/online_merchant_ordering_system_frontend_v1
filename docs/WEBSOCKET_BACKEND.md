# تعديل الباكند – إرسال حدث الطلب لغرفة الفرع فقط

حالياً الباكند يعمل:

```js
io.emit("order:created", { ... });
```

يعني **كل** العملاء المتصلين بيستقبلوا الحدث. عشان فقط Kitchen/Cashier تابعين للفرع يسمعوا الطلب، استخدم **غرفة الفرع**:

## التعديل في دالة create (بعد إنشاء الطلب)

**قبل:**

```js
const io = req.app?.get("io");
if (io) {
  io.emit("order:created", {
    order_id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_price: order.total_price,
    branch_id: tokenBranchId,
    table_id: tokenTableId || null,
  });
}
```

**بعد:**

```js
const io = req.app?.get("io");
if (io) {
  const payload = {
    order_id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_price: order.total_price,
    branch_id: tokenBranchId,
    table_id: tokenTableId || null,
  };
  // إرسال فقط للعملاء اللي انضموا لغرفة الفرع
  io.to(`branch:${tokenBranchId}`).emit("order:created", payload);
}
```

بهذا الشكل الفرونت لما يعمل `join:branch` بالـ branchId، هيدخل غرفة `branch:${branchId}` ويستقبل حدث `order:created` للطلبات اللي بتتعمل على الفرع ده فقط.
