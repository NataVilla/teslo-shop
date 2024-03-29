import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';


@Injectable()
export class SeedService {

  constructor(
    private readonly productsService: ProductsService
  ){}

  async runSeed(){
    await this.insertNewproducts();

    return 'SEED EXECUTED';
  }

  private async insertNewproducts(){

    await this.productsService.deleteAllProducts();
    return true;
  }
}
