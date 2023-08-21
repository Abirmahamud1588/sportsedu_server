const express = require("express"); //express installing
const app = express();
const cors = require("cors"); //cors installing

require("dotenv").config();

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.120eciu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userscollection = client.db("sportsedu").collection("user");
    const classcollection = client.db("sportsedu").collection("class");
    const cartscollection = client.db("sportsedu").collection("carts");
    const paymentcollection = client.db("sportsedu").collection("payments");

    //users uploading
    app.post("/user", async (req, res) => {
      const user = req.body;
      user.role = "student";
      const result = await userscollection.insertOne(user);
      res.send(result);
    });
    //user fetching
    app.get("/user", async (req, res) => {
      const result = await userscollection.find().toArray();
      res.send(result);
    });

    //admin email -security :verifyJwt
    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userscollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    //admin making
    app.patch("/user/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedocs = {
        $set: {
          role: "admin",
        },
      };
      const result = await userscollection.updateOne(filter, updatedocs);
      res.send(result);
    });

    //class fet
    app.get("/class", async (req, res) => {
      const result = await classcollection.find().toArray();
      res.send(result);
    });
    //class posting
    app.post("/class", async (req, res) => {
      const newItem = req.body;
      newItem.status = "pending";
      newItem.enrolled = 0;
      const result = await classcollection.insertOne(newItem);
      res.send(result);
    });
    app.patch("/class/approved/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedocs = {
        $set: {
          status: "approved",
        },
      };

      const result = await classcollection.updateOne(filter, updatedocs);
      res.send(result);
    });

    app.patch("/class/declined/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedocs = {
        $set: {
          status: "declined",
        },
      };

      const result = await classcollection.updateOne(filter, updatedocs);
      res.send(result);
    });
    //ins email -security :verifyJwt
    app.get("/user/instructor/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userscollection.findOne(query);
      const result = { admin: user?.role === "instructor" };
      res.send(result);
    });
    //inst making
    app.patch("/user/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedocs = {
        $set: {
          role: "instructor",
        },
      };
      const result = await userscollection.updateOne(filter, updatedocs);
      res.send(result);
    });

    //cart by user email
    app.get("/carts", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const result = await cartscollection.find(query).toArray();
      res.send(result);
    });

    //carts uploading
    app.post("/carts", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await cartscollection.insertOne(item);
      res.send(result);
    });
    //delete a product from the carts
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartscollection.deleteOne(query);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.get("/payments", async (req, res) => {
      const result = await paymentcollection.find().toArray();
      res.send(result);
    });

    // payment related api
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentcollection.insertOne(payment);

      const query = {
        _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await cartscollection.deleteMany(query);

      res.send({ insertResult, deleteResult });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("boos runninng");
});

app.listen(port, () => {
  console.log("server is running");
});
