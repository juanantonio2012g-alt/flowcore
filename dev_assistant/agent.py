import json
from pathlib import Path

from tools.files import read_file, write_file, replace_in_file, list_files
from tools.terminal import run_command
from tools.git_tools import git_status, git_diff
from tools.search import search_text

AGENT_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = AGENT_ROOT.parent

def resolve_path(path: str) -> str:
    p = Path(path)
    if p.is_absolute():
        return str(p)
    return str((PROJECT_ROOT / p).resolve())

def show_menu() -> None:
    print("\nDeveloper Assistant MVP")
    print(f"Proyecto base: {PROJECT_ROOT}")
    print("1. Listar archivos")
    print("2. Leer archivo")
    print("3. Buscar texto")
    print("4. Reemplazar bloque")
    print("5. Escribir archivo completo")
    print("6. Correr build")
    print("7. Git diff")
    print("8. Git status")
    print("9. Salir")

def main() -> None:
    while True:
        show_menu()
        option = input("Elige una opción: ").strip()

        try:
            if option == "1":
                root = input("Ruta base relativa al proyecto (default .): ").strip() or "."
                files = list_files(resolve_path(root))
                print(json.dumps(files[:300], indent=2, ensure_ascii=False))

            elif option == "2":
                path = input("Ruta del archivo relativa al proyecto: ").strip()
                print(read_file(resolve_path(path)))

            elif option == "3":
                query = input("Texto a buscar: ").strip()
                results = search_text(str(PROJECT_ROOT), query)
                print(json.dumps(results, indent=2, ensure_ascii=False))

            elif option == "4":
                path = input("Ruta del archivo relativa al proyecto: ").strip()
                full_path = resolve_path(path)

                print("Pega el bloque OLD. Termina con una línea que sea solo: __END__")
                old_lines = []
                while True:
                    line = input()
                    if line == "__END__":
                        break
                    old_lines.append(line)

                print("Pega el bloque NEW. Termina con una línea que sea solo: __END__")
                new_lines = []
                while True:
                    line = input()
                    if line == "__END__":
                        break
                    new_lines.append(line)

                ok = replace_in_file(full_path, "\n".join(old_lines), "\n".join(new_lines))
                print("Reemplazo exitoso." if ok else "No encontré el bloque.")

            elif option == "5":
                path = input("Ruta del archivo relativa al proyecto: ").strip()
                full_path = resolve_path(path)

                print("Pega el contenido completo. Termina con una línea que sea solo: __END__")
                lines = []
                while True:
                    line = input()
                    if line == "__END__":
                        break
                    lines.append(line)

                write_file(full_path, "\n".join(lines))
                print("Archivo escrito.")

            elif option == "6":
                cmd = input("Comando build/test (default: npm run build): ").strip() or "npm run build"
                result = run_command(cmd, cwd=str(PROJECT_ROOT))
                print("RETURN CODE:", result["returncode"])
                print(result["stdout"])
                print(result["stderr"])

            elif option == "7":
                result = git_diff(str(PROJECT_ROOT))
                print(result["stdout"] or result["stderr"])

            elif option == "8":
                result = git_status(str(PROJECT_ROOT))
                print(result["stdout"] or result["stderr"])

            elif option == "9":
                break

            else:
                print("Opción inválida.")

        except FileNotFoundError as e:
            print(f"Archivo no encontrado: {e.filename}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
