const express = require("express");
const dotenv = require("dotenv");
var cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

async function run() {
  try {
    // await client.connect();
    const db = client.db("travelhub");
    const ticketscollaction = db.collection("alltickets");
    const bookingticketcollation = db.collection("bookingticket");
    const usercollaction = db.collection("user");

    app.get("/api/alluser", async (req, res) => {
      let result = await usercollaction.find().toArray();
      res.send(result);
    });

    app.patch("/api/bookingticket/:id", async (req, res) => {
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

    app.patch("/api/alltickets/admin/:id", async (req, res) => {
      let { id } = req.params;
      let { status } = req.body;
      const result = await ticketscollaction.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } },
      );
      res.json(result);
    });

    app.patch("/api/alltickets/:id", async (req, res) => {
      let { id } = req.params;
      let data = req.body;
      const result = await ticketscollaction.updateOne(
        { _id: new ObjectId(id) },
        { $set: data },
      );
      res.json(result);
    });

    app.get("/api/Bookingtickets/:email", async (req, res) => {
      let { email } = req.params;
      let result = await bookingticketcollation
        .find({ userEmail: email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/api/alltickets/collaction", async (req, res) => {
      let result = await ticketscollaction
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/api/alltickets/:id", async (req, res) => {
      let { id } = req.params;
      let result = await ticketscollaction.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/api/allticketss/ticket", async (req, res) => {
      let result = await ticketscollaction
        .find({ status: "approved" })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/api/bookingticket/vendor/:email", async (req, res) => {
      let { email } = req.params;
      let result = await bookingticketcollation
        .find({ vendorEmail: email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // app.get("/api/allticketss/ticket", async (req, res) => {
    //   let result = await ticketscollaction
    //     .find({ status: "approved" })
    //     .sort({ createdAt: -1 })
    //     .toArray();
    //   res.send(result);
    // });

    app.get("/api/allticketss", async (req, res) => {
      let result = await ticketscollaction
        .find({ status: "approved" })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/api/allticketsemail/:vendorEmail", async (req, res) => {
      let { vendorEmail } = req.params;
      let result = await ticketscollaction
        .find({ vendorEmail })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/api/bookingticket", async (req, res) => {
      let data = req.body;
      let result = await bookingticketcollation.insertOne(data);
      res.json(result);
    });

    app.post("/api/allticket", async (req, res) => {
      let data = req.body;
      let result = await ticketscollaction.insertOne(data);
      res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
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
