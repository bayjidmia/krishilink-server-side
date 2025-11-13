const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.xyk22ac.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    // await client.connect();
    const productcollection = client.db("krishilink").collection("Products");

    // await client.db("admin").command({ ping: 1 });

    app.get("/latestproducts", async (req, res) => {
      const cursor = productcollection.find().sort({ _id: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/allproducts", async (req, res) => {
      const cursor = productcollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/allproducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productcollection.findOne(query);
      res.send(result);
    });

    app.post("/interests", async (req, res) => {
      try {
        const interest = req.body;
        const interestId = new ObjectId();
        const newInterest = { _id: interestId, ...interest };

        const result = await productcollection.updateOne(
          { _id: new ObjectId(interest.cropId) },
          { $push: { interests: newInterest } }
        );

        if (result.modifiedCount > 0) {
          res.status(201).send({ success: true, message: "Interest added!" });
        } else {
          res.status(404).send({ success: false, message: "Crop not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    app.get("/api/myinterests", async (req, res) => {
      let { userEmail } = req.query;

      if (!userEmail)
        return res.status(400).json({ error: "No user email provided" });

      userEmail = userEmail.trim().toLowerCase();

      try {
        const crops = await productcollection
          .find({ "interests.userEmail": userEmail })
          .toArray();

        console.log(" Crops found:", crops.length);

        const myInterests = [];

        crops.forEach((crop) => {
          crop.interests.forEach((interest) => {
            if (interest.userEmail.toLowerCase().trim() === userEmail) {
              myInterests.push({
                _id: interest._id,
                cropId: interest.cropId,
                cropName: crop.name,
                ownerName: crop.owner?.ownerName || "Unknown",
                quantity: interest.quantity,
                message: interest.message || "-",
                status: interest.status,
              });
            }
          });
        });

        console.log(" My Interests:", myInterests);

        res.json(myInterests);
      } catch (err) {
        console.error(" Error:", err);
        res.status(500).json({ error: "Server error" });
      }
    });

    app.put("/api/interests/update", async (req, res) => {
      const { cropsId, interestId, status } = req.body;

      if (!cropsId || !interestId || !status)
        return res
          .status(400)
          .json({ success: false, error: "Missing fields" });

      if (!["accepted", "rejected"].includes(status))
        return res
          .status(400)
          .json({ success: false, error: "Invalid status" });

      try {
        const crop = await crop.findById(cropsId);

        if (!crop)
          return res
            .status(404)
            .json({ success: false, error: "Crop not found" });

        const interest = crop.interests.find(
          (i) => i._id.toString() === interestId
        );
        if (!interest)
          return res
            .status(404)
            .json({ success: false, error: "Interest not found" });

        if (interest.status !== "pending")
          return res
            .status(400)
            .json({ success: false, error: "Already processed" });

        interest.status = status;

        if (status === "accepted") {
          crop.quantity -= interest.quantity;
          if (crop.quantity < 0) crop.quantity = 0;
        }

        await crop.save();

        res.json({
          success: true,
          message: `Interest ${status} successfully!`,
          interest,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
      }
    });
    app.post("/api/crops", async (req, res) => {
      try {
        const crop = req.body;
        console.log(" Received Crop:", crop);

        const result = await productcollection.insertOne(crop);
        res.status(201).json({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error(" Error adding crop:", error);
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    app.get("/api/crops", async (req, res) => {
      try {
        let { userEmail } = req.query;
        console.log("Received userEmail:", userEmail);

        // if (!userEmail) {
        //   return res.status(400).json({ error: "No user email provided" });
        // }

        userEmail = userEmail.trim().toLowerCase();

        const crops = await productcollection
          .find({ "owner.ownerEmail": userEmail })
          .toArray();
        console.log("Crops found:", crops.length);
        res.json(crops);
      } catch (err) {
        console.error("Error fetching crops:", err);
        res.status(500).json({ error: "Server error" });
      }
    });

    app.delete("/api/crops/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productcollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
