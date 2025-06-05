import crypto from 'node:crypto'

export class Category{
  constructor(
    public denomination: string,
    public description: string,
    public abbreviation: string,
    public status: string,
    public id: string = crypto.randomUUID()
  ) {}
}
