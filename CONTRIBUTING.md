# Contribuir

Este proyecto sigue un flujo de trabajo GitFlow manejado con **git puro** (no
hace falta el plugin `git-flow`). Hay dos ramas de largo plazo:

- `main`/`master` — producción. Solo se recibe desde `develop` (releases) o
  desde `hotfix/*` (arreglos urgentes). Nunca se trabaja directamente acá.
- `develop` — integración/diaria. Es la rama base de trabajo.

## Rol del asistente (opencode)

El asistente (IA) se encarga de **desarrollar**. NO hace merge ni cierra
trabajo sobre `develop` ni `main`. El flujo es:

1. Desde un spec (en `specs/`) sale un branch de tipo
   `feature/`, `enhancement/` o `fix/` **desde `develop`** (o `hotfix/`
   **desde `main`**).
2. El asistente desarrolla **dentro de ese branch** y hace commits.
3. El asistente **pushea solo su branch al remoto** (`git push -u origin
   <branch>`), sin tocar `develop` ni `main`.
4. El dueño (humano) arma el **PR** del branch hacia `develop` (o hacia
   `main` en el caso de `hotfix/*`) y lo mergea.

El asistente **no mergea ni borra** branches contra `develop`/`main`. Eso lo
hace siempre el dueño mediante PR.

## Ramas

| Tipo          | Sale de   | PR hacia  | Nombre                    |
| ------------- | --------- | --------- | ------------------------- |
| Feature       | `develop` | `develop` | `feature/<descripcion>`   |
| Fix           | `develop` | `develop` | `fix/<descripcion>`       |
| Enhancement   | `develop` | `develop` | `enhancement/<descripcion>`|
| Hotfix        | `main`    | `main`    | `hotfix/<descripcion>`    |

### Feature / Fix / Enhancement

```bash
# el asistente:
git checkout develop
git checkout -b feature/autenticacion-google

# ... desarrolla y hace commits ...

# push SOLO del branch al remoto (sin tocar develop/main):
git push -u origin feature/autenticacion-google
```

Luego el **dueño** arma el PR `feature/autenticacion-google → develop` y lo
mergea.

### Hotfix (arreglo urgente sobre producción)

```bash
# el asistente:
git checkout main
git checkout -b hotfix/correccion-critica

# ... fix + commit ...

# push SOLO del branch:
git push -u origin hotfix/correccion-critica
```

Luego el **dueño** arma el PR `hotfix/correccion-critica → main` y lo mergea,
y decide si propagarlo a `develop`.

## Release (a producción)

Lo hace el **dueño**: PR / merge de `develop` → `main`.

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
