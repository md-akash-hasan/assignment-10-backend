const express = require("express");
const dotenv = require("dotenv");
var cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;

const uri = process.env.MONGO_DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const jwks = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ msg: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ msg: "Unauthorized" });
  }
  try {
    const { payload } = await jwtVerify(token, jwks);
    console.log(payload);
    next();
  } catch {
    return res.status(401).json({ msg: "Unauthorized" });
  }
};

async function run() {
  try {
    // await client.connect();
    const db = client.db("travelhub");
    const ticketscollaction = db.collection("alltickets");
    const bookingticketcollation = db.collection("bookingticket");
    const usercollaction = db.collection("user");
    const subscriptioncollation = db.collection("subscriptionpayment");
    const paymenticketscollaction = db.collection("ticketpayment");

    // app.get("/api/vendor/totaladdticket/:vendorEmail", async (req, res) => {
    //   let { vendorEmail } = req.params;
    //   let result = await ticketscollaction.countDocuments({
    //     vendorEmail,
    //     status: "approved",
    //   });
    //   res.json(count: result)
    // });

    app.delete("/api/delete/:id", verifyToken, async (req, res) => {
      let { id } = req.params;
      let result = await ticketscollaction.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    app.post("/api/fraute/:id", verifyToken, async (req, res) => {
      let { id } = req.params;
      let { fraute } = req.body;
      let result = await usercollaction.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { fraute: fraute },
        },
      );
      res.json(result);
    });

    app.post("/api/adbatice/:id", verifyToken, async (req, res) => {
      let { id } = req.params;
      let { adbatice } = req.body;
      let result = await ticketscollaction.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { adbatice: adbatice },
        },
      );
      res.json(result);
    });

    app.get(
      "/api/vandorpayment/:vendorEmail",
      verifyToken,
      async (req, res) => {
        let { vendorEmail } = req.params;
        let result = await paymenticketscollaction
          .find({ vendorEmail })
          .toArray();

        const totalRevenue = result.reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        );

        res.send({ totalRevenue });
      },
    );

    app.get(
      "/api/bookingvandor/:vendorEmail",
      verifyToken,
      async (req, res) => {
        let { vendorEmail } = req.params;
        let result = await bookingticketcollation.countDocuments({
          vendorEmail,
          status: "paid",
        });
        res.send({ count: result });
      },
    );

    app.get("/api/booking/:userEmail", verifyToken, async (req, res) => {
      let { userEmail } = req.params;
      let result = await bookingticketcollation.countDocuments({
        userEmail,
        status: "paid",
      });
      res.send({ count: result });
    });

    app.get("/api/Totalbooking/:userEmail", verifyToken, async (req, res) => {
      let { userEmail } = req.params;
      let result = await bookingticketcollation.countDocuments({
        userEmail,
      });
      res.send({ count: result });
    });

    // booking collaction
    // app.get("/api/booking/:vendorEmail", async (req, res) => {
    //   let { vendorEmail } = req.params;
    //   // let result = await bookingticketcollation.countDocuments({
    //   //   vendorEmail,
    //   //   status: "paid",
    //   // });
    //   // res.send({ count: result });
    //   let all = await bookingticketcollation
    //     .find({ vendorEmail: vendorEmail })
    //     .toArray();
    //   console.log(all);
    //   res.send(all);
    // });

    app.get("/api/totalticket/:vendorEmail", verifyToken, async (req, res) => {
      let { vendorEmail } = req.params;
      let result = await ticketscollaction.countDocuments({
        vendorEmail,
        status: "approved",
      });
      res.send({ count: result });
    });

    app.get("/api/payments/:userEmail", verifyToken, async (req, res) => {
      let { userEmail } = await req.params;

      let result = await paymenticketscollaction
        .find({ userEmail })
        .sort({ paymentdate: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/api/payment/ticket", verifyToken, async (req, res) => {
      let data = req.body;
      console.log(data.bookingId);
      // const isexject =
      await paymenticketscollaction.insertOne(data);
      await bookingticketcollation.updateOne(
        { _id: new ObjectId(data.bookingId) },
        { $set: { status: "paid" } },
      );
      await ticketscollaction.updateOne({ _id: new ObjectId(data.ticketId) }, [
        {
          $set: {
            present_quantity: {
              $subtract: [
                { $toInt: "$present_quantity" },
                Number(data.quantity),
              ],
            },
          },
        },
      ]);
      res.json({ message: "payment saved" });
    });

    app.post("/subscription", verifyToken, async (req, res) => {
      let data = req.body;
      // console.log(data);
      const isexject = await subscriptioncollation.findOne({
        session_id: data.session_id,
      });
      if (isexject) {
        return;
      }
      await subscriptioncollation.insertOne(data);
      await usercollaction.updateOne(
        { _id: new ObjectId(data.userId) },
        { $set: { ispremium: "pro" } },
      );
      res.json({ message: "payment success" });
    });

    app.get("/api/alluser", verifyToken, async (req, res) => {
      let result = await usercollaction.find().toArray();
      res.send(result);
    });

    app.patch("/api/bookingticket/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["accepted", "rejected", "paid", "pending"].includes(status)) {
          return res.status(400).json({ message: "Invalid status value" });
        }

        const result = await bookingticketcollation.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Booking not found" });
        }

        res.json(result);
      } catch (error) {
        console.error("Failed to update booking status:", error);
        res.status(500).json({ message: "Failed to update booking" });
      }
    });

    app.patch("/api/admin/user/:id", verifyToken, async (req, res) => {
      let { id } = req.params;
      let { role } = req.body;
      const result = await usercollaction.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } },
      );
      res.json(result);
    });

    app.patch("/api/alltickets/admin/:id", verifyToken, async (req, res) => {
      let { id } = req.params;
      let { status } = req.body;
      const result = await ticketscollaction.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } },
      );
      res.json(result);
    });

    app.patch("/api/alltickets/:id", verifyToken, async (req, res) => {
      let { id } = req.params;
      let data = req.body;
      const result = await ticketscollaction.updateOne(
        { _id: new ObjectId(id) },
        { $set: data },
      );
      res.json(result);
    });

    app.get("/api/Bookingtickets/:email", verifyToken, async (req, res) => {
      let { email } = req.params;
      let result = await bookingticketcollation
        .find({ userEmail: email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });
    app.get(
      "/api/alltickets/admin/collaction",
      verifyToken,
      async (req, res) => {
        try {
          let result = await ticketscollaction
            .aggregate([
              {
                $lookup: {
                  from: "user",
                  localField: "vendorEmail",
                  foreignField: "email",
                  as: "vendorData",
                },
              },
              {
                $unwind: {
                  path: "$vendorData",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $match: { "vendorData.fraute": { $ne: true } },
              },
              {
                $sort: { createdAt: -1 },
              },
              {
                $project: { vendorData: 0 },
              },
            ])
            .toArray();

          res.send(result);
        } catch (error) {
          res.status(500).send({ message: "Internal Server Error" });
        }
      },
    );

    app.get("/api/alltickets/collaction", verifyToken, async (req, res) => {
      try {
        let result = await ticketscollaction
          .aggregate([
            {
              $match: { status: "approved" }, // ← add করলাম
            },
            {
              $lookup: {
                from: "user",
                localField: "vendorEmail",
                foreignField: "email",
                as: "vendorData",
              },
            },
            {
              $unwind: {
                path: "$vendorData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: { "vendorData.fraute": { $ne: true } },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $project: { vendorData: 0 },
            },
          ])
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/api/alltickets/:id", verifyToken, async (req, res) => {
      let { id } = req.params;
      let result = await ticketscollaction.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/api/allticketss/ticket", async (req, res) => {
      let {
        page = "1",
        limit = "6",
        from,
        to,
        transportType,
        sort,
      } = req.query;
      let skip = (Number(page) - 1) * Number(limit);

      let searchMatch = { status: "approved" };
      if (from) searchMatch.from = { $regex: from, $options: "i" };
      if (to) searchMatch.to = { $regex: to, $options: "i" };
      if (transportType)
        searchMatch.transportType = { $regex: transportType, $options: "i" };

      let sortStage = { createdAt: -1 };
      if (sort === "price_asc") sortStage = { priceNum: 1 };
      if (sort === "price_desc") sortStage = { priceNum: -1 };

      try {
        // ১. ডাটা তুলে আনার পাইপলাইন (আগের মতোই আছে)
        let pipeline = [
          { $match: searchMatch },
          {
            $lookup: {
              from: "user",
              localField: "vendorEmail",
              foreignField: "email",
              as: "vendorData",
            },
          },
          {
            $unwind: { path: "$vendorData", preserveNullAndEmptyArrays: true },
          },
          { $match: { "vendorData.fraute": { $ne: true } } },
          {
            $addFields: {
              priceNum: { $toDouble: "$price" },
            },
          },
          { $sort: sortStage },
          { $project: { vendorData: 0, priceNum: 0 } },
        ];

        let result = await ticketscollaction
          .aggregate(pipeline)
          .skip(skip)
          .limit(Number(limit))
          .toArray();

        // 💡 ২. কাউন্ট করার জন্য একদম আলাদা এবং ফ্রেশ পাইপলাইন (এখানেই চেঞ্জ করা হয়েছে)
        let countPipeline = [
          { $match: searchMatch },
          {
            $lookup: {
              from: "user",
              localField: "vendorEmail",
              foreignField: "email",
              as: "vendorData",
            },
          },
          {
            $unwind: { path: "$vendorData", preserveNullAndEmptyArrays: true },
          },
          { $match: { "vendorData.fraute": { $ne: true } } },
          { $count: "total" },
        ];

        let countResult = await ticketscollaction
          .aggregate(countPipeline)
          .toArray();

        let count = countResult[0]?.total || 0;
        let totalpages = Math.ceil(count / Number(limit));

        // সার্ভার টার্মিনালে চেক করার জন্য এই লগটি দেখতে পারেন
        console.log(`Total Found: ${count}, Total Pages: ${totalpages}`);

        res.send({ result, page: Number(page), totalpages });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // app.get("/api/allticketss/adbatice/ticket", async (req, res) => {
    //   let result = await ticketscollaction
    //     .find({ status: "approved", adbatice: true })
    //     .sort({ createdAt: -1 })
    //     .limit(3)
    //     .toArray();
    //   res.send(result);
    // });

    // home page adbatice
    app.get(
      "/api/allticketss/adbatice/ticket",

      async (req, res) => {
        try {
          let result = await ticketscollaction
            .aggregate([
              // ১. প্রথমে অনুমোদিত এবং অ্যাডভার্টাইজড (adbatice: true) টিকিটগুলো ফিল্টার করুন
              {
                $match: {
                  status: "approved",
                  adbatice: true,
                },
              },

              // ২. টিকিট কালেকশনের 'vendorEmail' এর সাথে ইউজার কালেকশনের 'email' জয়েন করুন
              {
                $lookup: {
                  from: "user", // ইউজার কালেকশনের নাম
                  localField: "vendorEmail", // টিকিট অবজেক্টের ফিল্ড
                  foreignField: "email", // ইউজার অবজেক্টের ফিল্ড
                  as: "vendorData",
                },
              },

              // ৩. লুপআপ করা ডাটা অবজেক্ট আকারে পড়ার সুবিধার্থে আনউইন্ড করুন
              {
                $unwind: {
                  path: "$vendorData",
                  preserveNullAndEmptyArrays: true, // ভেন্ডর ডিলিট হয়ে গেলেও যেন কোড ক্র্যাশ না করে
                },
              },

              // ৪. আসল ফিল্টার: ভেন্ডরের 'fraute' প্রোপার্টি যেন true না হয়
              {
                $match: {
                  "vendorData.fraute": { $ne: true },
                },
              },

              // ৫. নতুন বিজ্ঞাপনের টিকিট আগে দেখানোর জন্য সর্ট করুন
              {
                $sort: { createdAt: -1 },
              },

              // ৬. মাত্র ৩টি বিজ্ঞাপনের টিকিট লিমিট করুন
              {
                $limit: 3,
              },

              // ৭. ফ্রন্টএন্ডে ক্লিন ডাটা পাঠানোর জন্য অতিরিক্ত 'vendorData' ফিল্ডটি বাদ দিন
              {
                $project: {
                  vendorData: 0,
                },
              },
            ])
            .toArray();

          res.send(result);
        } catch (error) {
          console.error(
            "Error fetching advertised tickets without fraud:",
            error,
          );
          res.status(500).send({ message: "Internal Server Error" });
        }
      },
    );

    app.get(
      "/api/bookingticket/vendor/:email",
      verifyToken,
      async (req, res) => {
        let { email } = req.params;
        let result = await bookingticketcollation
          .find({ vendorEmail: email })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      },
    );
    // admin adbatice api
    app.get("/api/adbatice/ticket", verifyToken, async (req, res) => {
      try {
        let result = await ticketscollaction
          .aggregate([
            {
              $match: { status: "approved" },
            },
            {
              $lookup: {
                from: "user",
                localField: "vendorEmail",
                foreignField: "email",
                as: "vendorData",
              },
            },
            {
              $unwind: {
                path: "$vendorData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: { "vendorData.fraute": { $ne: true } },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $project: { vendorData: 0 },
            },
          ])
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/api/allticketss", async (req, res) => {
      try {
        let result = await ticketscollaction
          .aggregate([
            // ১. প্রথমে শুধু অনুমোদিত (approved) টিকিটগুলো ফিল্টার করুন
            {
              $match: { status: "approved" },
            },

            // ২. টিকিট কালেকশনের 'vendorEmail' এর সাথে ইউজার কালেকশনের 'email' মিলিয়ে ডাটা নিয়ে আসুন
            {
              $lookup: {
                from: "user", // আপনার ইউজার কালেকশনের আসল নাম (db.collection("user"))
                localField: "vendorEmail", // টিকিট অবজেক্টের ফিল্ড
                foreignField: "email", // ইউজার অবজেক্টের ফিল্ড
                as: "vendorData", // যে নামে ম্যাচ করা ডাটা সেভ হবে
              },
            },

            // ৩. লুপআপ করা ডাটা অবজেক্ট আকারে পড়ার সুবিধার্থে আনউইন্ড করুন
            {
              $unwind: {
                path: "$vendorData",
                preserveNullAndEmptyArrays: true, // যদি কোনো টিকিটের ভেন্ডর প্রোফাইল ডিলিট হয়ে যায় তাও যেন ক্র্যাশ না করে
              },
            },

            // ৪. আসল ফিল্টার: ভেন্ডরের 'fraute' প্রোপার্টি যেন true না হয় ($ne মানে Not Equal)
            {
              $match: {
                "vendorData.fraute": { $ne: true },
              },
            },

            // ৫. নতুন টিকিট আগে দেখানোর জন্য সর্ট করুন (-1 মানে Descending)
            {
              $sort: { createdAt: -1 },
            },

            // ৬. হোমপেজে দেখানোর জন্য মাত্র ৬টি টিকিট লিমিট করুন
            {
              $limit: 6,
            },

            // ৭. (ঐচ্ছিক) ফ্রন্টএন্ডে ক্লিন ডাটা পাঠানোর জন্য 'vendorData' ফিল্ডটি বাদ দিয়ে দিন
            {
              $project: {
                vendorData: 0,
              },
            },
          ])
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching non-fraud tickets:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get(
      "/api/allticketsemails/:vendorEmail",
      verifyToken,
      async (req, res) => {
        try {
          const { vendorEmail } = req.params;
          const count = await ticketscollaction.countDocuments({ vendorEmail });
          res.json({ count });
        } catch (error) {
          res
            .status(500)
            .json({ message: "Server error", error: error.message });
        }
      },
    );

    app.get(
      "/api/allticketsemail/:vendorEmail",
      verifyToken,
      async (req, res) => {
        let { vendorEmail } = req.params;
        let result = await ticketscollaction
          .find({ vendorEmail })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      },
    );

    app.post("/api/bookingticket", verifyToken, async (req, res) => {
      let data = req.body;
      let result = await bookingticketcollation.insertOne(data);
      res.json(result);
    });

    app.post("/api/allticket", verifyToken, async (req, res) => {
      let data = req.body;
      let result = await ticketscollaction.insertOne(data);
      res.json(result);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
