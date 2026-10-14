require('dotenv').config();

const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());

app.use(express.static(__dirname));

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        error: "Too many requests, please try again later."
    }
});

app.use(limiter);

const orders = [
    {
        id: 1,
        customerName: "Maria Santos",
        loadCount: 2,
        status: "Pending",
        dropOffTime: "8:00 AM"
    },
    {
        id: 2,
        customerName: "Pedro Reyes",
        loadCount: 1,
        status: "Washing",
        dropOffTime: "9:15 AM"
    },
    {
        id: 3,
        customerName: "Ana Cruz",
        loadCount: 3,
        status: "Ready for Pickup",
        dropOffTime: "7:30 AM"
    }
];

function validateOrder(data, partial = false) {

    const errors = [];

    if (!partial || data.customerName !== undefined) {

        if (
            !data.customerName ||
            typeof data.customerName !== "string" ||
            data.customerName.trim() === ""
        ) {
            errors.push("customerName is required.");
        }
    }

    if (!partial || data.loadCount !== undefined) {

        if (
            typeof data.loadCount !== "number" ||
            data.loadCount <= 0
        ) {
            errors.push(
                "loadCount must be a positive number."
            );
        }
    }


    // Status
    if (!partial || data.status !== undefined) {

        const allowedStatuses = [
            "Pending",
            "Washing",
            "Ready for Pickup",
            "Claimed"
        ];

        if (!allowedStatuses.includes(data.status)) {

            errors.push(
                "status must be one of: " +
                allowedStatuses.join(", ")
            );
        }
    }

    if (!partial || data.dropOffTime !== undefined) {

        if (
            !data.dropOffTime ||
            typeof data.dropOffTime !== "string" ||
            data.dropOffTime.trim() === ""
        ) {
            errors.push(
                "dropOffTime is required."
            );
        }
    }


    return errors;
}

function requireApiKey(req, res, next) {

    const key = req.headers["x-api-key"];

    if (!key || key !== process.env.API_KEY) {

        const error = new Error(
            "Invalid or missing API key."
        );

        error.statusCode = 401;

        return next(error);
    }

    next();
}

app.get('/orders', (req, res) => {

    res.json(orders);

});

app.post('/orders', requireApiKey, (req, res, next) => {

    try {

        const errors = validateOrder(req.body);

        if (errors.length > 0) {

            const error = new Error(
                errors.join(" ")
            );

            error.statusCode = 400;

            throw error;
        }


        const {
            customerName,
            loadCount,
            status,
            dropOffTime
        } = req.body;


        const newOrder = {

            id: orders.length > 0
                ? Math.max(
                    ...orders.map(order => order.id)
                ) + 1
                : 1,

            customerName,
            loadCount,
            status,
            dropOffTime
        };


        orders.push(newOrder);


        res.status(201).json(newOrder);

    } catch (error) {

        next(error);

    }

});

app.put('/orders/:id', requireApiKey, (req, res, next) => {

    try {

        const order = orders.find(
            o => o.id === parseInt(req.params.id)
        );


        if (!order) {

            const error = new Error(
                "Order not found"
            );

            error.statusCode = 404;

            throw error;
        }

        const errors = validateOrder(
            req.body,
            true
        );


        if (errors.length > 0) {

            const error = new Error(
                errors.join(" ")
            );

            error.statusCode = 400;

            throw error;
        }


        // Update fields
        if (req.body.customerName !== undefined) {

            order.customerName =
                req.body.customerName;
        }


        if (req.body.loadCount !== undefined) {

            order.loadCount =
                req.body.loadCount;
        }


        if (req.body.status !== undefined) {

            order.status =
                req.body.status;
        }


        if (req.body.dropOffTime !== undefined) {

            order.dropOffTime =
                req.body.dropOffTime;
        }


        res.json(order);

    } catch (error) {

        next(error);

    }

});

app.delete(
    '/orders/:id',
    requireApiKey,
    (req, res, next) => {

        try {

            const index = orders.findIndex(
                o => o.id === parseInt(req.params.id)
            );


            if (index === -1) {

                const error = new Error(
                    "Order not found"
                );

                error.statusCode = 404;

                throw error;
            }


            const removed = orders.splice(
                index,
                1
            );


            res.json({

                message: "Order cancelled",

                cancelledOrder: removed[0]

            });

        } catch (error) {

            next(error);

        }

    }
);

app.use((req, res, next) => {

    const error = new Error(
        "Route not found"
    );

    error.statusCode = 404;

    next(error);

});

app.use((error, req, res, next) => {

    console.error(error);

    const statusCode =
        error.statusCode || 500;


    res.status(statusCode).json({

        error:
            error.message ||
            "Internal server error."

    });

});

app.listen(PORT, () => {

    console.log(
        `Laundry API running at http://localhost:${PORT}`
    );

    console.log(
        `Order panel: http://localhost:${PORT}/index.html`
    );

});
