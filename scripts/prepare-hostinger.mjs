import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicBuild = resolve(root, ".output", "hostinger-public");
const target = resolve(root, "hostinger-upload");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(resolve(publicBuild, "assets"), resolve(target, "assets"), { recursive: true });
await cp(resolve(publicBuild, "hosting", "index.html"), resolve(target, "index.html"));

await mkdir(resolve(target, "api"), { recursive: true });
for (const file of ["index.php", ".htaccess", "config.example.php"]) {
  await cp(resolve(root, "api", file), resolve(target, "api", file));
}

await cp(resolve(root, "hosting", "hostinger.htaccess"), resolve(target, ".htaccess"));

const configExample = await readFile(resolve(root, "api", "config.example.php"), "utf8");
const productionConfig = configExample
  .replace("'db_host' => '127.0.0.1'", "'db_host' => 'localhost'")
  .replace("'db_name' => 'mallard_egg_classifier'", "'db_name' => 'u426451480_eggclassifier'")
  .replace("'db_user' => 'root'", "'db_user' => 'YOUR_HOSTINGER_DATABASE_USER'")
  .replace("'db_pass' => ''", "'db_pass' => 'YOUR_HOSTINGER_DATABASE_PASSWORD'")
  .replace("'allowed_origin' => ''", "'allowed_origin' => 'https://eggclassifier.isujones.online'");

await writeFile(resolve(target, "api", "config.production-template.php"), productionConfig);

console.log(`Hostinger package prepared at: ${target}`);
console.log("Upload its CONTENTS to the subdomain document root.");
console.log("Rename api/config.production-template.php to api/config.php on Hostinger and enter the real credentials and Roboflow key.");
