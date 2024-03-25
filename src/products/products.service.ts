import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dtos';
import { Product, ProductImage } from './entities/product.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { validate as isUUID} from 'uuid';



@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(

    @InjectRepository(Product)
    private readonly productRepository:Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImagesRepository:Repository<ProductImage>,

    private readonly datasource: DataSource,

  ){}



   async create(createProductDto: CreateProductDto) {
    
    try{
      const { images = [], ...productDetails } = createProductDto


      const product = this.productRepository.create({
        ...createProductDto,
        images: images.map( image => this.productImagesRepository.create({ url: image }))
      });//crear repositorio
      await this.productRepository.save( product ); //grabar repositorio

      return { ...product, images };

    }catch (error){
     this.handleDBExeptions(error);
    }

    
  }

   async findAll(paginationDto:PaginationDto) {
    const { limit =10, offset = 0 } = paginationDto;

    const products= await this.productRepository.find({
      take: limit, //toma todo lo que venga en limit
      skip: offset, //Saltate todo lo que venga en offset
      relations: {
        images: true, //nos permite ver en la busqueda las relaciones que hay en las tablas.
      }  
    })
    return products.map( product => ({
      ...product,
      images: product.images.map( img => img.url )
    }))
  }

  async findOne(term: string) {

    let product: Product;

    if ( isUUID(term) ) {
      product = await this.productRepository.findOneBy({ id: term });
    }else{
    const queryBuilder = this.productRepository.createQueryBuilder('prod');
    product = await queryBuilder
      .where('UPPER(title) =:title or slug =:slug', {
        title: term.toUpperCase(),
        slug: term.toLowerCase(),
      })
      .leftJoinAndSelect('prod.images','prodImages')
      .getOne();
      //product = await this.productRepository.findOneBy({ slug: term });
    }


    if (!product) 
      throw new NotFoundException( `Producto with id ${ term } not found` )

    return product
  }

  async findOnePlain ( term: string ) {
    const {images = [], ...rest } = await this.findOne( term );
    return{
      ...rest,
      images: images.map( image => image.url)
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const {images, ...toUpdate } = updateProductDto;


    const product = await this.productRepository.preload({id, ...toUpdate});
    
    if (!product)
    throw new NotFoundException(`Product with id: ${id} not found`);

    //create query runner
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();




try {

  if ( images ) {
    await queryRunner.manager.delete( ProductImage, { product: { id } } );

    product.images = images.map( image => this.productImagesRepository.create({ url: image }))
  }

  await queryRunner.manager.save( product );

  //await this.productRepository.save( product );
  await queryRunner.commitTransaction();
  await queryRunner.release();

  return this.findOnePlain( id );
} catch (error) {

  await queryRunner.rollbackTransaction();
  await queryRunner.release();
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
