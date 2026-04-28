export type NodoArea = {
  clave: "operaciones" | "comercial" | "tecnico" | "administracion";
  titulo: string;
  descripcion: string;
  responsable: string;
  color: "blue" | "emerald" | "violet" | "amber";
  items: string[];
};

export type EstructuraOrganigrama = {
  direccion: string;
  areas: NodoArea[];
};

export const organigramaBase: EstructuraOrganigrama = {
  direccion: "Dirección General",
  areas: [
    {
      clave: "operaciones",
      titulo: "Operaciones",
      descripcion: "Orquesta el flujo del caso, la continuidad y el control de próximas acciones.",
      responsable: "Coordinación operativa",
      color: "blue",
      items: ["Gestión de casos", "Seguimiento operativo"],
    },
    {
      clave: "comercial",
      titulo: "Comercial",
      descripcion: "Gestiona la relación con el cliente, el avance comercial y las cotizaciones.",
      responsable: "Coordinación comercial",
      color: "emerald",
      items: ["Gestión comercial", "Cotizaciones"],
    },
    {
      clave: "tecnico",
      titulo: "Técnico",
      descripcion: "Produce criterio técnico, documentación, diagnóstico y validación.",
      responsable: "Coordinación técnica",
      color: "violet",
      items: ["Informes técnicos", "Diagnóstico", "Validación técnica"],
    },
    {
      clave: "administracion",
      titulo: "Administración / Soporte",
      descripcion: "Sostiene el orden documental, el soporte transversal y la continuidad administrativa.",
      responsable: "Coordinación administrativa",
      color: "amber",
      items: ["Control documental", "Soporte administrativo"],
    },
  ],
};
