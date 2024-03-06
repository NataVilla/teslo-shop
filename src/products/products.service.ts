import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dtos';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { validate as isUUID} from 'uuid';



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

  findAll(paginationDto:PaginationDto) {
    const { limit =10, offset = 0 } = paginationDto;

    return this.productRepository.find({
      take: limit, //toma todo lo que venga en limit
      skip: offset, //Saltate todo lo que venga en offset
      //ToDO relaciones
    });
  }

  async findOne(term: string) {

    let product: Product;

    if ( isUUID(term) ) {
      product = await this.productRepository.findOneBy({ id: term });
    }else{
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder
      .where('UPPER(title) =:title or slug =:slug', {
        title: term.toUpperCase(),
        slug: term.toLowerCase(),
      }).getOne();
      //product = await this.productRepository.findOneBy({ slug: term });
    }


    if (!product) 
      throw new NotFoundException( `Producto with id ${ term } not found` )

    return product
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto,
    });
    
    if (!product)
    throw new NotFoundException(`Product with id: ${id} not found`);

try {
  await this.productRepository.save( product );
  return product;
} catch (error) {
  this.handleDBExeptions(error);
}
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
