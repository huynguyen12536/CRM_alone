// Atlas configuration for Prisma schema integration.
// Docs: https://atlasgo.io/guides/frameworks/prisma

data "external_schema" "prisma" {
  program = [
    "npx",
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    "./internal/prisma/schema",
    "--script",
  ]
}

env "local" {
  src = data.external_schema.prisma.url
  dev = "docker://postgres/16/dev?search_path=public"

  url = env("DATABASE_URL")

  migration {
    dir = "file://internal/prisma/migrations"
  }

  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}

env "uat" {
  src = data.external_schema.prisma.url
  dev = "docker://postgres/16/dev?search_path=public"

  url = env("DATABASE_URL")

  migration {
    dir = "file://internal/prisma/migrations"
  }

  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
