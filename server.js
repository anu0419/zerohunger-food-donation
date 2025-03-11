const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
var serviceAccount = require("./key.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const bp = require("body-parser");
const ph = require("password-hash");
const uniqId = require("uniqid");
const session = require("express-session");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const app = express();

// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/food-images';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Filter for image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

const messageSchema = {
  senderId: String,
  receiverId: String,
  content: String,
  timestamp: FieldValue.serverTimestamp()
};

// Define OpenStreetMap styles to avoid undefined references
const OSM_STYLES = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());
app.use(express.static('public')); // Serve static files from public directory
app.use(
  session({
    secret: "food donation app",
    resave: true,
    saveUninitialized: true,
  })
);

app.get("/", function (req, res) {
  res.render("intro");
});

app.get("/signup", function (req, res) {
  res.render("reg_home");
});

app.get("/orgRegister", function (req, res) {
  res.render("org_register", { sucState: false, errState: false });
});

app.get("/donRegister", function (req, res) {
  res.render("don_register", { sucState: false, errState: false });
});

app.get("/orglogin", function (req, res) {
  res.render("org_login", { errState: false });
});

app.get("/donlogin", function (req, res) {
  res.render("don_login", { errState: false });
});

app.get("/chat", (req, res) => {
  res.render("chat"); // This will render chat.ejs
});

app.get("/chat/:receiverId", async (req, res) => {
  const receiverId = req.params.receiverId;
  let senderId;
  
  // Determine if the user is a donor or organization
  if (req.session.userEmail) {
    const donorSnapshot = await db.collection("Donors").where("email", "==", req.session.userEmail).get();
    if (!donorSnapshot.empty) {
      senderId = donorSnapshot.docs[0].data().Donor_name;
    }
  } else if (req.session.orgEmail) {
    const orgSnapshot = await db.collection("Organizations").where("email", "==", req.session.orgEmail).get();
    if (!orgSnapshot.empty) {
      senderId = orgSnapshot.docs[0].data().organization_name;
    }
  }
  
  if (!senderId) {
    console.error("Sender ID not found. Redirecting to home.");
    return res.redirect("/");
  }

  res.render("chat", { senderId, receiverId });
});

app.post("/org_register_submit", function (req, res) {
  const email = req.body.email;
  const psw = req.body.psw;
  const c_psw = req.body.c_psw;
  db.collection("Organizations")
    .where("email", "==", email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        res.render("org_register", {
          sucState: false,
          errState: true,
          errMsg: "Organization Already Exists.!",
        });
      } else {
        if (psw == c_psw) {
          db.collection("Organizations")
            .add({
              organization_name: req.body.organization_name,
              organization_id: req.body.org_id,
              owner_name: req.body.owner_name,
              email: email,
              password: ph.generate(psw),
              ph_no: req.body.phone_no,
              state: req.body.state,
              dist: req.body.district,
              city: req.body.city,
              street: req.body.street,
              pincode: req.body.pincode,
            })
            .then(() => {
              res.render("org_register", { sucState: true, errState: false });
            });
        } else {
          res.render("org_register", {
            sucState: false,
            errState: true,
            errMsg: "Pasword Doesn't Match.!",
          });
        }
      }
    });
  // console.log(req.body);
});

app.post("/don_register_submit", function (req, res) {
  const email = req.body.email;
  const psw = req.body.psw;
  const c_psw = req.body.c_psw;
  db.collection("Donors")
    .where("email", "==", email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        res.render("don_register", {
          sucState: false,
          errState: true,
          errMsg: "Donor Already Exists.!",
        });
      } else {
        if (psw == c_psw) {
          db.collection("Donors")
            .add({
              Donor_name: req.body.user_name,
              email: email,
              password: ph.generate(psw),
              ph_no: req.body.phone_no,
              state: req.body.state,
              dist: req.body.district,
              city: req.body.city,
              street: req.body.street,
              pincode: req.body.pincode,
            })
            .then(() => {
              res.render("don_register", { sucState: true, errState: false });
            });
        } else {
          res.render("don_register", {
            sucState: false,
            errState: true,
            errMsg: "Pasword Doesn't Match.!",
          });
        }
      }
    });
});

app.post("/org_login_submit", async function (req, res) {
  const org_id = req.body.org_id;
  const email = req.body.email;
  const psw = req.body.psw;
  const orgdb = await db
    .collection("Organizations")
    .where("email", "==", email)
    .get();

  if (orgdb.size == 0) {
    res.render("org_login", {
      errState: true,
      errMsg: "Owner not Found.!",
    });
  } else {
    const userData = orgdb.docs[0].data();
    if (!ph.verify(psw, userData.password)) {
      // Incorrect password
      res.render("org_login", {
        errState: true,
        errMsg: "Incorrect password.!",
      });
    } else {
      if (org_id == userData.organization_id) {
        // Successful login
        req.session.orgEmail = email;
        const orgHisRef = orgdb.docs[0].ref
          .collection("Donation_History")
          .where("Status", "==", "Pending");
        const orgHis = await orgHisRef.get();
        const org_his_data = orgHis.docs.map((doc) => doc.data());
        res.render("org_home", {
          name: userData.organization_name,
          dataArr: { org_his_data },
        });
      } else {
        //incorrect org id
        res.render("org_login", {
          errState: true,
          errMsg: "Organization not Found.!",
        });
      }
    }
  }
});

app.post("/don_login_submit", function (req, res) {
  const email = req.body.email;
  const psw = req.body.psw;
  db.collection("Donors")
    .where("email", "==", email)
    .get()
    .then((docs) => {
      if (docs.size == 0) {
        res.render("don_login", {
          errState: true,
          errMsg: "Donor not Found.!",
        });
      } else {
        const userData = docs.docs[0].data();
        if (!ph.verify(psw, userData.password)) {
          // Incorrect password
          res.render("don_login", {
            errState: true,
            errMsg: "Incorrect password.!",
          });
        } else {
          // Successful login
          req.session.userEmail = email;
          res.render("don_home", { name: userData.Donor_name });
        }
      }
    });
});

app.get("/donat_food", async function (req, res) {
  const organizationsSnapshot = await db.collection("Organizations").get();
  const org_data = organizationsSnapshot.docs.map((doc) => doc.data());

  const user_email = req.session.userEmail;
  if (!user_email) {
    return res.redirect('/donlogin');
  }
  
  const don_data = await db
    .collection("Donors")
    .where("email", "==", user_email)
    .get();
    
  if (don_data.empty) {
    return res.redirect('/donlogin');
  }
  
  res.render("food_donate_form", {
    dataArr: { org_data },
    don_details: don_data.docs[0].data(),
    OSM_STYLES: OSM_STYLES
  });
});

app.post("/donat_food_submit", async function (req, res) {
  const orderID = uniqId();
  const date = new Date();
  const user_email = req.session.userEmail;
  const don_data = db.collection("Donors").where("email", "==", user_email);
  const donSnapshot = await don_data.get();
  //
  const orgRef = db
    .collection("Organizations")
    .where("organization_name", "==", req.body.orgname);
  const orgSnapshot = await orgRef.get();
  const orgDoc = orgSnapshot.docs[0];
  const donationHistoryRef = orgDoc.ref.collection("Donation_History");

  // Parse quality assessment data if available
  let qualityAssessment = null;
  if (req.body.foodQualityAssessment) {
    try {
      qualityAssessment = JSON.parse(req.body.foodQualityAssessment);
    } catch (e) {
      console.error('Error parsing quality assessment:', e);
    }
  }
  await donationHistoryRef.add({
    OrderId: orderID,
    Status: "Pending",
    Date: date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(),
    Donor_name: donSnapshot.docs[0].data().Donor_name,
    Donor_ph_no: donSnapshot.docs[0].data().ph_no,
    Donor_email: donSnapshot.docs[0].data().email,
    Donation: req.body.Donation,
    Donor_address:
      donSnapshot.docs[0].data().street +
      "/" +
      donSnapshot.docs[0].data().city +
      "/" +
      donSnapshot.docs[0].data().dist +
      "/" +
      donSnapshot.docs[0].data().state +
      "/" +
      donSnapshot.docs[0].data().pincode,
    Items: req.body.item,
    EachItem_Qty: req.body.qty,
    QualityAssessment: qualityAssessment,
  });
  // console.log(req.body);

  const donDoc = donSnapshot.docs[0];
  const donHisRef = donDoc.ref.collection("Donation_History");
  await donHisRef.add({
    OrderId: orderID,
    Date: date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(),
    Donate_to: req.body.orgname,
    Donation: req.body.Donation,
    Organization_ph: orgDoc.data().ph_no,
    address:
      donSnapshot.docs[0].data().street +
      "/" +
      donSnapshot.docs[0].data().city +
      "/" +
      donSnapshot.docs[0].data().dist +
      "/" +
      donSnapshot.docs[0].data().state +
      "/" +
      donSnapshot.docs[0].data().pincode,
    Items: req.body.item,
    EachItem_Qty: req.body.qty,
    Status: "Pending",
    QualityAssessment: qualityAssessment,
  });
});

app.get("/donat_grocy", async function (req, res) {
  const organizationsSnapshot = await db.collection("Organizations").get();
  const org_data = organizationsSnapshot.docs.map((doc) => doc.data());

  const user_email = req.session.userEmail;
  if (!user_email) {
    return res.redirect('/donlogin');
  }
  
  const don_data = await db
    .collection("Donors")
    .where("email", "==", user_email)
    .get();
    
  if (don_data.empty) {
    return res.redirect('/donlogin');
  }
  
  res.render("grocery_donate_form", {
    dataArr: { org_data },
    don_details: don_data.docs[0].data(),
    OSM_STYLES: OSM_STYLES
  });
});

app.post("/donat_grocery_submit", async function (req, res) {
  const orderID = uniqId();
  const date = new Date();
  const user_email = req.session.userEmail;
  const orgRef = db
    .collection("Organizations")
    .where("organization_name", "==", req.body.orgname);
  const orgSnapshot = await orgRef.get();
  const orgDoc = orgSnapshot.docs[0];
  const donationHistoryRef = orgDoc.ref.collection("Donation_History");

  const don_data = db.collection("Donors").where("email", "==", user_email);
  const donSnapshot = await don_data.get();

  await donationHistoryRef.add({
    OrderId: orderID,
    Status: "Pending",
    Date: date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(),
    Donor_name: donSnapshot.docs[0].data().Donor_name,
    Donor_ph_no: donSnapshot.docs[0].data().ph_no,
    Donor_email: donSnapshot.docs[0].data().email,
    Donation: req.body.Donation,
    Donor_address:
      donSnapshot.docs[0].data().street +
      "/" +
      donSnapshot.docs[0].data().city +
      "/" +
      donSnapshot.docs[0].data().dist +
      "/" +
      donSnapshot.docs[0].data().state +
      "/" +
      donSnapshot.docs[0].data().pincode,
    Items: req.body.item,
    EachItem_Qty: req.body.qty,
  });
  // console.log(req.body);

  const donDoc = donSnapshot.docs[0];
  const donHisRef = donDoc.ref.collection("Donation_History");
  await donHisRef.add({
    OrderId: orderID,
    Date: date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(),
    Donate_to: req.body.orgname,
    Donation: req.body.Donation,
    Organization_ph: orgDoc.data().ph_no,
    address:
      donSnapshot.docs[0].data().street +
      "/" +
      donSnapshot.docs[0].data().city +
      "/" +
      donSnapshot.docs[0].data().dist +
      "/" +
      donSnapshot.docs[0].data().state +
      "/" +
      donSnapshot.docs[0].data().pincode,
    Items: req.body.item,
    EachItem_Qty: req.body.qty,
    Status: "Pending",
  });
});

app.get("/don_history", async (req, res) => {
  const donor_email = req.session.userEmail;

  const donQuery = db.collection("Donors").where("email", "==", donor_email);
  const donSnapshot = await donQuery.get();
  const don_name = donSnapshot.docs[0].data().Donor_name;

  //"Donation_History" subcollection
  const donHistoryRef = donSnapshot.docs[0].ref.collection("Donation_History");
  const donData = await donHistoryRef.get();
  const don_his_data = donData.docs.map((doc) => doc.data());

  res.render("don_history", {
    name: don_name,
    dataArr: { don_his_data },
  });
});

app.get("/don_profile", async (req, res) => {
  const don_email = req.session.userEmail;
  if (!don_email) {
    return res.redirect('/donlogin');
  }

  // "Donors" collection to get donor data
  const donorQuery = db.collection("Donors").where("email", "==", don_email);
  const donorSnapshot = await donorQuery.get();
  
  if (donorSnapshot.empty) {
    return res.redirect('/donlogin');
  }
  
  const don_data = donorSnapshot.docs[0].data();

  //"Donation_History" subcollection
  const donHisRef = donorSnapshot.docs[0].ref.collection("Donation_History");
  const donHis = await donHisRef.get();
  const no_donations = donHis.size;
  res.render("don_profile", { 
    don_data, 
    no_donations,
    OSM_STYLES: OSM_STYLES
  });
});

app.get("/org_profile", async (req, res) => {
  const org_email = req.session.orgEmail;
  if (!org_email) {
    return res.redirect('/orglogin');
  }

  // "Organization" collection to get donor data
  const donorQuery = db
    .collection("Organizations")
    .where("email", "==", org_email);
  const donorSnapshot = await donorQuery.get();
  
  if (donorSnapshot.empty) {
    return res.redirect('/orglogin');
  }
  
  const org_data = donorSnapshot.docs[0].data();

  //"Donation_History" subcollection
  const donHisRef = donorSnapshot.docs[0].ref.collection("Donation_History");
  const donHis = await donHisRef.get();
  const no_donations = donHis.size;
  res.render("org_profile", { 
    org_data, 
    no_donations,
    OSM_STYLES: OSM_STYLES
  });
});

app.get("/don_home", (req, res) => {
  const don_email = req.session.userEmail;
  if (!don_email) {
    return res.redirect('/donlogin');
  }
  db.collection("Donors")
    .where("email", "==", don_email)
    .get()
    .then((docs) => {
      const name = docs.docs[0].data().Donor_name;
      res.render("don_home", { name });
    });
});

app.get("/org_home",async (req, res) => {
  const org_email = req.session.orgEmail;
  if (!org_email) {
    return res.redirect('/orglogin');
  }
  const orgdb = await db
    .collection("Organizations")
    .where("email", "==", org_email)
    .get();
  
  const orgData = orgdb.docs[0].data();
  const orgHisRef = orgdb.docs[0].ref.collection("Donation_History").where("Status", "==", "Pending");
  const orgHis = await orgHisRef.get();
  const org_his_data = orgHis.docs.map((doc) => doc.data());
  res.render("org_home", {
    name: orgData.organization_name,
    dataArr: { org_his_data },
  });
})

app.post("/donation_accept", async (req, res) => {
  const org_email = req.session.orgEmail;
  const donor_email = req.body.orderemail;
  const orderid = req.body.orderid;
  const time = req.body.time;

  const donorQuery = db
    .collection("Organizations")
    .where("email", "==", org_email);
  const donorSnapshot = await donorQuery.get();

  const donHisRef = donorSnapshot.docs[0].ref.collection("Donation_History");
  const donHis = await donHisRef.where("OrderId", "==", orderid).get();

  const donationDoc = donHis.docs[0];
  await donationDoc.ref.update({
    Status: "Accepted",
    time: time,
  });

  const donQuery = db.collection("Donors").where("email", "==", donor_email);
  const donSnapshot = await donQuery.get();

  //"Donation_History" subcollection
  const donHistoryRef = donSnapshot.docs[0].ref.collection("Donation_History");
  const donData = await donHistoryRef.where("OrderId", "==", orderid).get();

  const donDoc = donData.docs[0];
  await donDoc.ref.update({
    Status: "Accepted",
    time: time,
  });

  const orgdb = await db
    .collection("Organizations")
    .where("email", "==", org_email)
    .get();
  const userData = orgdb.docs[0].data();

  const orgHisRef = orgdb.docs[0].ref
    .collection("Donation_History")
    .where("Status", "==", "Pending");
  const orgHis = await orgHisRef.get();
  const org_his_data = orgHis.docs.map((doc) => doc.data());
  res.render("org_home", {
    name: orgdb.docs[0].data().organization_name,
    dataArr: { org_his_data },
  });
});

app.get("/org_history", async (req, res) => {
  const email = req.session.orgEmail;
  const orgdb = await db
    .collection("Organizations")
    .where("email", "==", email)
    .get();
  const userData = orgdb.docs[0].data();

  const orgHisRef = orgdb.docs[0].ref
    .collection("Donation_History")
    .where("Status", "!=", "Pending");
  const orgHis = await orgHisRef.get();
  const org_his_data = orgHis.docs.map((doc) => doc.data());
  res.render("org_history", {
    name: userData.organization_name,
    dataArr: { org_his_data },
  });
});

app.post("/donation_collect", async (req, res) => {
  const org_email = req.session.orgEmail;
  const donor_email = req.body.orderemail;
  const orderid = req.body.orderid;

  const donorQuery = db
    .collection("Organizations")
    .where("email", "==", org_email);
  const donorSnapshot = await donorQuery.get();

  const donHisRef = donorSnapshot.docs[0].ref.collection("Donation_History");
  const donHis = await donHisRef.where("OrderId", "==", orderid).get();

  const donationDoc = donHis.docs[0];
  await donationDoc.ref.update({
    Status: "Collected",
  });

  const donQuery = db.collection("Donors").where("email", "==", donor_email);
  const donSnapshot = await donQuery.get();

  //"Donation_History" subcollection
  const donHistoryRef = donSnapshot.docs[0].ref.collection("Donation_History");
  const donData = await donHistoryRef.where("OrderId", "==", orderid).get();

  const donDoc = donData.docs[0];
  await donDoc.ref.update({
    Status: "Collected",
  });

  const orgdb = await db
    .collection("Organizations")
    .where("email", "==", org_email)
    .get();
  const userData = orgdb.docs[0].data();

  const orgHisRef = orgdb.docs[0].ref
    .collection("Donation_History")
    .where("Status", "!=", "Pending");
  const orgHis = await orgHisRef.get();
  const org_his_data = orgHis.docs.map((doc) => doc.data());
  res.render("org_history", {
    name: userData.organization_name,
    dataArr: { org_his_data },
  });
});

app.post('/messages', async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  
  if (!senderId || !receiverId || !content) {
    return res.status(400).send('Missing required fields');
  }
  
  try {
    await db.collection('messages').add({
      senderId,
      receiverId,
      content,
      timestamp: FieldValue.serverTimestamp()
    });
    res.status(200).send('Message sent successfully.');
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Error sending message: ' + error.message);
  }
});

app.get('/messages/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  
  if (!user1 || !user2) {
    return res.status(400).send('Missing required parameters');
  }
  
  try {
    const messagesRef = db.collection('messages');
    
    const snapshot = await messagesRef
      .orderBy('timestamp')
      .get();
    
    const messages = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if ((data.senderId === user1 && data.receiverId === user2) || 
          (data.senderId === user2 && data.receiverId === user1)) {
        messages.push({
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
        });
      }
    });
    
    res.json(messages);
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).send('Error retrieving messages: ' + error.message);
  }
});

app.get('/api/organizations', async (req, res) => {
  try {
    const organizationsSnapshot = await db.collection('Organizations').get();
    const organizations = [];
    
    organizationsSnapshot.forEach(doc => {
      const data = doc.data();
      organizations.push({
        id: doc.id,
        name: data.organization_name,
        email: data.email
      });
    });
    
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).send('Error fetching organizations');
  }
});

app.get('/api/donors', async (req, res) => {
  try {
    const donorsSnapshot = await db.collection('Donors').get();
    const donors = [];
    
    donorsSnapshot.forEach(doc => {
      const data = doc.data();
      donors.push({
        id: doc.id,
        name: data.Donor_name,
        email: data.email
      });
    });
    
    res.json(donors);
  } catch (error) {
    console.error('Error fetching donors:', error);
    res.status(500).send('Error fetching donors');
  }
});

app.get("/find-organizations", async (req, res) => {
  try {
    // Get all organizations
    const organizationsSnapshot = await db.collection("Organizations").get();
    const organizations = [];
    
    organizationsSnapshot.forEach(doc => {
      organizations.push(doc.data());
    });
    
    res.render("find_organizations", { 
      organizations,
      OSM_STYLES: OSM_STYLES
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).send("Error fetching organizations");
  }
});

// New API endpoints for the recommendation service

// Get organizations with location data for recommendations
app.get('/api/organizations/with-location', async (req, res) => {
  try {
    const organizationsSnapshot = await db.collection('Organizations').get();
    const organizations = [];
    
    organizationsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Create a location object if we have address data
      let location = null;
      if (data.street && data.city && data.state && data.pincode) {
        // We'll geocode this on the client side
        location = {
          address: `${data.street}, ${data.city}, ${data.dist}, ${data.state}, ${data.pincode}`
        };
      }
      
      organizations.push({
        id: doc.id,
        name: data.organization_name,
        email: data.email,
        phone: data.ph_no,
        location: location,
        address: {
          street: data.street,
          city: data.city,
          district: data.dist,
          state: data.state,
          pincode: data.pincode
        }
      });
    });
    
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations with location:', error);
    res.status(500).send('Error fetching organizations');
  }
});

// Get donation history for the logged-in donor
app.get('/api/donor/history', async (req, res) => {
  try {
    if (!req.session.userEmail) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const donorEmail = req.session.userEmail;
    const donorQuery = db.collection("Donors").where("email", "==", donorEmail);
    const donorSnapshot = await donorQuery.get();
    
    if (donorSnapshot.empty) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    
    const donorDoc = donorSnapshot.docs[0];
    const donHistoryRef = donorDoc.ref.collection("Donation_History");
    const donHistorySnapshot = await donHistoryRef.get();
    
    const donationHistory = [];
    donHistorySnapshot.forEach(doc => {
      donationHistory.push(doc.data());
    });
    
    res.json(donationHistory);
  } catch (error) {
    console.error('Error fetching donor history:', error);
    res.status(500).send('Error fetching donor history');
  }
});

// Get recommended organizations for a donor
app.get('/api/recommended-organizations', async (req, res) => {
  try {
    if (!req.session.userEmail) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const donorEmail = req.session.userEmail;
    const donorQuery = db.collection("Donors").where("email", "==", donorEmail);
    const donorSnapshot = await donorQuery.get();
    
    if (donorSnapshot.empty) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    
    const donorData = donorSnapshot.docs[0].data();
    
    // Get all organizations
    const organizationsSnapshot = await db.collection('Organizations').get();
    const organizations = [];
    
    organizationsSnapshot.forEach(doc => {
      const data = doc.data();
      organizations.push({
        id: doc.id,
        name: data.organization_name,
        email: data.email,
        phone: data.ph_no,
        address: {
          street: data.street,
          city: data.city,
          district: data.dist,
          state: data.state,
          pincode: data.pincode
        }
      });
    });
    
    // Get donor's donation history
    const donorDoc = donorSnapshot.docs[0];
    const donHistoryRef = donorDoc.ref.collection("Donation_History");
    const donHistorySnapshot = await donHistoryRef.get();
    
    const donationHistory = [];
    donHistorySnapshot.forEach(doc => {
      donationHistory.push(doc.data());
    });
    
    // Simple recommendation algorithm based on donation history
    const scoredOrganizations = organizations.map(org => {
      let score = 0;
      
      // Factor 1: Previous donation history
      const previousDonations = donationHistory.filter(
        donation => donation.Donate_to === org.name
      );
      
      if (previousDonations.length > 0) {
        // Reward previous successful donations
        score += Math.min(previousDonations.length * 10, 30); // Max 30 points for history
      }
      
      // Factor 2: Location proximity (simple matching by city/district)
      if (org.address.city === donorData.city) {
        score += 20; // Same city
      } else if (org.address.district === donorData.dist) {
        score += 10; // Same district
      }
      
      return {
        ...org,
        score
      };
    });
    
    // Sort by score (highest first)
    const recommendations = scoredOrganizations.sort((a, b) => b.score - a.score);
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).send('Error generating recommendations');
  }
});

app.post('/api/analyze-food-image', upload.single('foodImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Create public URL for the uploaded image
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/food-images/${req.file.filename}`;
    
    // Get the file path
    const filePath = req.file.path;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'Image file not found' });
    }
    
    // Read the file data
    const imageBuffer = fs.readFileSync(filePath);
    
    // Simple image analysis based on buffer data
    const imageAnalysis = analyzeImageData(imageBuffer, req.file.originalname);
    
    // Create response with the analysis results
    const response = {
      identifiedAs: imageAnalysis.foodType,
      confidence: imageAnalysis.confidence,
      freshness: imageAnalysis.freshness,
      quality: imageAnalysis.quality,
      isEdible: imageAnalysis.isEdible,
      warning: imageAnalysis.warning,
      imageUrl: imageUrl
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error analyzing food image:', error);
    res.status(500).json({ error: 'Error analyzing food image: ' + error.message });
  }
});

/**
 * Analyze image data to determine food quality
 * This is a simulation of what a real ML model would do
 * 
 * @param {Buffer} imageBuffer - The image data
 * @param {string} filename - Original filename (used as fallback)
 * @returns {Object} Analysis results
 */
function analyzeImageData(imageBuffer, filename) {
  try {
    // In a real implementation, this would use computer vision APIs
    // For simulation, we'll use some properties of the image data
    
    // Extract a simple hash from the image data
    let hash = 0;
    for (let i = 0; i < Math.min(imageBuffer.length, 5000); i++) {
      hash = ((hash << 5) - hash) + imageBuffer[i];
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use the hash to determine image properties (simulating ML analysis)
    const normalizedHash = Math.abs(hash) / 2147483647; // Normalize to 0-1
    
    // Determine food type from filename as fallback
    const foodType = filename.split('.')[0].replace(/-/g, ' ');
    
    // Check for visual patterns that might indicate spoilage
    // This is a simulation - we're using the hash to create deterministic but seemingly random results
    const colorVariance = (normalizedHash * 100) % 1; // 0-1 range
    const textureComplexity = ((normalizedHash * 200) % 1) * 0.8 + 0.2; // 0.2-1 range
    const brightnessLevel = ((normalizedHash * 300) % 1) * 0.7 + 0.3; // 0.3-1 range
    
    // Analyze image properties to determine quality
    // Lower brightness and higher color variance often indicate spoilage
    const spoilageIndicator = (1 - brightnessLevel) * 0.4 + colorVariance * 0.6;
    
    let quality, freshness, confidence, warning, isEdible;
    
    // Determine quality based on image analysis
    if (spoilageIndicator > 0.7) {
      // High spoilage indicator suggests poor quality
      quality = 'Poor';
      freshness = 'Poor';
      confidence = 0.8 + (normalizedHash * 0.15);
      warning = 'The food appears to be spoiled based on visual analysis and is not suitable for donation.';
      isEdible = false;
    } else if (spoilageIndicator > 0.4) {
      // Medium spoilage indicator suggests fair quality
      quality = 'Fair';
      freshness = 'Fair';
      confidence = 0.7 + (normalizedHash * 0.2);
      warning = 'The food shows some signs of aging and may have limited freshness.';
      isEdible = true;
    } else {
      // Low spoilage indicator suggests good quality
      quality = 'Good';
      freshness = 'Good';
      confidence = 0.75 + (normalizedHash * 0.2);
      warning = null;
      isEdible = true;
    }
    
    // Return the analysis results
    return {
      foodType,
      confidence,
      freshness,
      quality,
      isEdible,
      warning,
      // Include some "raw" data that would come from a real ML model
      rawData: {
        colorVariance,
        textureComplexity,
        brightnessLevel,
        spoilageIndicator
      }
    };
  } catch (error) {
    console.error('Error in image analysis:', error);
    // Return a default response in case of error
    return {
      foodType: 'Unknown food',
      confidence: 0.5,
      freshness: 'Unknown',
      quality: 'Unknown',
      isEdible: false,
      warning: 'Could not analyze the image properly.',
      rawData: {}
    };
  }
}

// Define the port for the server
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/logout", function (req, res) {
  // Clear the session
  req.session.destroy(function(err) {
    if(err) {
      console.error("Error destroying session:", err);
      return res.redirect('/');
    }
    // Redirect to the intro page after logout
    res.redirect('/');
  });
});
