const express = require("express");
const app = express();
require('dotenv').config({ path: 'variables.env' });
const exphbs = require("express-handlebars");
const expressFileUpload = require("express-fileupload");
const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY
const PORT = process.env.PORT || 3000

const host = process.env.HOST || '0.0.0.0'
const path = require("path");
const {
  nuevoUsuario,
  getUsuarios,
  setUsuarioStatus,
  getUsuario,
  setDatosUsuario,
  deleteCuenta,
} = require("./consultas");

app.listen(PORT, host, (req, res) => {
  console.log(`Servidor ON port: ${PORT}`);
});

//Static
app.use(express.static(path.join(__dirname, "/public")));
app.use(
  "/css",
  express.static(path.join(__dirname, "/node_modules/bootstrap/dist/css"))
);

//Midleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Middleware para express-fileupload
app.use(
  expressFileUpload({
    limits: { fileSize: 5000000 },
    abortOnLimit: true,
    responseOnLimit:
      "El peso del archivo que intentas subir supera el limite permitido",
  })
);

// Importar motor de plantillas handlebars
app.set("view engine", "hbs");

app.engine(
  "hbs",
  exphbs({
    defaultLayout: "main",
    layoutsDir: `${__dirname}/views/partials/`,
    extname: ".hbs",
    helpers: {
      inc: function (value) {
        return parseInt(value) + 1;
      },
    },
  })
);

//Routes
app.get("/", async (req, res) => {
  try {
    const usuarios = await getUsuarios();
    res.render("home", { usuarios });
  } catch (error) {
    res.status(500).send({
      error: `Algo salió mal... ${e}`,
      code: 500,
    });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/registro", (req, res) => {
  res.render("registro");
});

app.get("/admin", async (req, res) => {
  try {
    const usuarios = await getUsuarios();
    res.render("admin", { usuarios });
  } catch (e) {
    res.status(500).send({
      error: `Algo salió mal... ${e}`,
      code: 500,
    });
  }
});

// Ruta para datos
app.get("/datos", (req, res) => {
  const { token } = req.query;
  jwt.verify(token, secretKey, (err, decoded) => {
    const { data } = decoded;
    const email = data[0].email;
    const nombre = data[0].nombre;
    const password = data[0].password;
    const anos_experiencia = data[0].anos_experiencia;
    const especialidad = data[0].especialidad;
    err
      ? res.status(401).send({
          error: "401 Unauthorized",
          message: "Usted no está autorizado para estar aquí",
          token_error: err.message,
        })
      : res.render("datos", {
          email,
          nombre,
          password,
          anos_experiencia,
          especialidad,
        });
  });
});

//ruta para cambiar datos
app.put("/datos", async (req, res) => {
  const { email, nombre, password, anos_experiencia, especialidad } = req.body;
  try {
    const usuario = await setDatosUsuario(
      email,
      nombre,
      password,
      anos_experiencia,
      especialidad
    );
    res.status(200).send(usuario);
  } catch (e) {
    res.status(500).send({
      error: `Algo salió mal... ${e}`,
      code: 500,
    });
  }
});

// Ruta POST /registro
app.post("/registro", async (req, res) => {
  const {
    email,
    nombre,
    password,
    password_2,
    anos_experiencia,
    especialidad,
  } = req.body;
  const { foto } = req.files;
  const { name } = foto;
  if (password !== password_2) {
    res.send(
      '<script>alert("Las contraseñas no coinciden."); window.location.href = "/registro"; </script>'
    );
  } else {
    try {
      const respuesta = await nuevoUsuario(
        email,
        nombre,
        password,
        anos_experiencia,
        especialidad,
        name
      ).then(() => {
        foto.mv(`${__dirname}/public/uploads/${name}`, (err) => {
          res.send(
            '<script>alert("Se ha registrado con éxito."); window.location.href = "/login"; </script>'
          );
        });
      });
    } catch (e) {
      res.status(500).send({
        error: `Algo salió mal... ${e}`,
        code: 500,
      });
    }
  }
});

// Ruta GET /usuarios
app.get("/usuarios", async (req, res) => {
  const respuesta = await getUsuarios();
  res.send(respuesta);
});

// ruta para cambiar estado
app.put("/usuarios", async (req, res) => {
  const { estado, id } = req.body;
  try {
    const usuarios = await setUsuarioStatus(estado, id);
    res.status(200).send(usuarios);
  } catch (e) {
    res.status(500).send({
      error: `Algo salió mal... ${e}`,
      code: 500,
    });
  }
});

//ruta para verificar que el email y password existen en la base de datos
app.post("/verify", async (req, res) => {
  const { email, password } = req.body;
  const user = await getUsuario(email, password);

  if (email === "" || password === "") {
    res.status(401).send({
      error: "Debe completar todos los campos",
      code: 401,
    });
  } else {
    if (user.length != 0) {
      if (user[0].estado === true) {
        const token = jwt.sign(
          {
            exp: Math.floor(Date.now() / 1000) + 180,
            data: user,
          },
          secretKey
        );
        res.send(token);
        console.log(user[0].estado);
      } else {
        res.status(401).send({
          error: `El registro de este usuario no ha sido aprobado`,
          code: 401,
        });
        console.log(user[0].estado);
      }
    } else {
      res.status(404).send({
        error:
          "Este usuario no está registrado en la base de datos o la contraseña es incorrecta.",
        code: 404,
      });
    }
  }
});

// ruta para eliminar los usuarios
app.delete("/eliminar_cuenta/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const respuesta = await deleteCuenta(email);
    res.status(200).send(respuesta.toString());
  } catch (e) {
    res.status(500).send({
      error: `Algo salió mal... ${e}`,
      code: 500,
    });
  }
});
