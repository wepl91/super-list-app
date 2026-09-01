# Contribuir

Este proyecto sigue un flujo de trabajo GitFlow simplificado, manejado con
**git puro** (no hace falta el plugin `git-flow`). Tenemos dos ramas de largo
plazo:

- `main` — producción. Solo se recibe desde `develop` (releases) o desde
  `hotfix/*` (arreglos urgentes). Nunca se trabaja directamente acá.
- `develop` — integración/diaria. Es la rama base de trabajo.

Todas las ramas de trabajo deben ramificarse de la rama correcta y volver a
ella para su integración.

## Ramas

| Tipo          | Sale de   | Vuelve a  | Nombre                    |
| ------------- | --------- | --------- | ------------------------- |
| Feature       | `develop` | `develop` | `feature/<descripcion>`   |
| Fix           | `develop` | `develop` | `fix/<descripcion>`       |
| Enhancement   | `develop` | `develop` | `enhancement/<descripcion>`|
| Hotfix        | `main`    | `main` y `develop` | `hotfix/<descripcion>` |

### Feature / Fix / Enhancement

```bash
git checkout develop
git checkout -b feature/autenticacion-google

# ... trabajás y hacés commits con mensajes claros ...

git checkout develop
git merge feature/autenticacion-google
git push origin develop

# opcional: borrar la rama local
git branch -d feature/autenticacion-google
```

### Release (a producción)

```bash
git checkout main
git merge develop
git push origin main
```

### Hotfix (arreglo urgente sobre producción)

Sale de `main` y se integra tanto en `main` como en `develop` para no perderlo:

```bash
git checkout main
git checkout -b hotfix/correccion-critica

# ... fix + commit ...

git checkout main
git merge hotfix/correccion-critica
git push origin main

# llevarlo también a develop
git checkout develop
git merge hotfix/correccion-critica
git push origin develop

git branch -d hotfix/correccion-critica
```

## Convenciones

- **Mensajes de commit:** estilo Conventional Commits
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`, `test:`).
- **Idioma:** los mensajes, código de la UI y documentación son en español
  (salvo los prefijos de Conventional Commits, en inglés).
- **Antes de mergear:** correr lint, typecheck y build.

## Setup del repositorio

```bash
git clone git@github.com:wepl91/super-list-app.git
cd super-list-app
npm install
```

Crear las variables de entorno (ver `.env.local` local o pedirlas al owner).
Para desarrollo: `npm run dev`.
