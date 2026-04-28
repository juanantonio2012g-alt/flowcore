import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta la variable ${name}.`);
  }

  return value;
}

async function findUserByEmail(supabase, email) {
  let page = 1;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase()
    );

    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();
  const email = requireEnv("DEMO_USER_EMAIL");
  const password = requireEnv("DEMO_USER_PASSWORD");

  if (!serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SERVICE_KEY para crear el usuario demo."
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const existingUser = await findUserByEmail(supabase, email);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre_visible: "Cliente Demo OpenCore",
          tipo_acceso: "demo",
        },
      }
    );

    if (error) {
      throw error;
    }

    console.log("Usuario demo actualizado.");
    console.log(`id=${data.user.id}`);
    console.log(`email=${data.user.email}`);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre_visible: "Cliente Demo OpenCore",
      tipo_acceso: "demo",
    },
  });

  if (error) {
    throw error;
  }

  console.log("Usuario demo creado.");
  console.log(`id=${data.user.id}`);
  console.log(`email=${data.user.email}`);
}

main().catch((error) => {
  console.error("No se pudo provisionar el usuario demo.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
