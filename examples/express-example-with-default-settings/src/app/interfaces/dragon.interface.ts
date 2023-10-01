export interface IDragon {
  id: number;
  name: string;
  title: string;
}

export interface IDragonResponse {
  dragon: IDragon;
}

export interface IDragonListResponse {
  dragons: IDragon[];
}
