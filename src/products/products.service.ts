import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundError } from 'rxjs';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(

    @InjectRepository(Product)
    private readonly productRepository:Repository<Product>,

  ){}



   async create(createProductDto: CreateProductDto) {
    
    try{

      const product = this.productRepository.create(createProductDto);//crear repositorio
      await this.productRepository.save( product ); //grabar repositorio

      return product;

    }catch (error){
     this.handleDBExeptions(error);
    }

    
  }

  findAll() {
    return this.productRepository.find({});
  }

  async findOne(id: string) {

    const product = await this.productRepository.findOneBy({ id });
    if (!product) 
      throw new NotFoundException( `Producto with id ${ id } not found` )

    return product
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  async remove(id: string) {
    const product = await this.findOne( id );
    await this.productRepository.remove(product);
  }

  private handleDBExeptions(error:any){
    if (error.code === '23505')
        throw new BadRequestException(error.detail);

      this.logger.error(error)
      throw new InternalServerErrorException('Unexpected eror, check server logs!')
  }
}
