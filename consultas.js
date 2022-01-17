/* const { Pool } = require("pg"); */
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'variables.env' })
// configuracion de la instancia Pool
/* const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  native: true,
  ssl: true,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  dialectOptions: {ssl: true}
}); */

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect();



// Función asincrónica para consultar todos los usuarios
const getUsuarios = async () => {
  try {
    const usuarios = await client.query("SELECT * FROM skaters");
    return usuarios.rows;
  } catch (e) {
    console.log(e);
  }
};

// Función asincrónica para ingresar un usuario
const nuevoUsuario = async (
  email,
  nombre,
  password,
  anos_experiencia,
  especialidad,
  foto
) => {
  let passwordHash = await hashPassword(password);
  let params = {
    text: `INSERT INTO skaters 
(email,nombre,password,anos_experiencia,especialidad,foto,estado)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *`,
    values: [
      email,
      nombre,
      passwordHash,
      anos_experiencia,
      especialidad,
      foto,
      false,
    ],
  };
  try {
    const result = await client.query(params);
    

  } catch (e) {
    console.log(e);
  }
};

//ruta asincrónica para cambiar status de usuario
const setUsuarioStatus = async (estado, id) => {
  try {
    let params = {
      text: "UPDATE skaters SET estado = $1 WHERE id = $2 RETURNING *",
      values: [estado, id],
    };
    const result = await client.query(params);
    const usuario = result.rows[0];
    return usuario;
  } catch (e) {
    console.log(e);
  }
};



async function getUsuario(email, password) {
  try {
    let params = {
      text: 'SELECT * FROM skaters WHERE email = $1',
      values: [email]
    }
    const result = await client.query(params);
    if (result.rowCount > 0) {
      const isSame = await bcrypt.compare(password, result.rows[0].password);
      console.log("isSame: ", isSame);
      if (isSame) {
        return result.rows;
      }
      else {
        return [];
      }
    }
    else {
      return result.rows;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
}

// ruta para actualizar datos de perfil
const setDatosUsuario = async (
  email,
  nombre,
  password,
  anos_experiencia,
  especialidad
) => {
  try {
    let passwordHash = await hashPassword(password);
    let params = {
      text: `UPDATE skaters SET nombre = $1, password =$2, anos_experiencia = $3, especialidad = $4  WHERE email = $5 RETURNING *`,
      values: [nombre, passwordHash, anos_experiencia, especialidad, email],
    };
    const result = await client.query(params);

    const usuario = result.rows;
    return usuario;
  } catch (e) {
    console.log(e);
  }
};

//ruta para eliminar usuario
const deleteCuenta = async (email)=> {
  try {
    let params = {
      text:'DELETE FROM skaters WHERE email = $1',
      values: [email]
    }
    const result = await client.query(params)
    return result.rowCount;
  } catch (e) {
    console.log(e);
  }
  
   
}

//hash para encriptar el password
const hashPassword = async (password)=> {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}


module.exports = {
  nuevoUsuario,
  getUsuarios,
  setUsuarioStatus,
  getUsuario,
  setDatosUsuario,
  deleteCuenta,
}