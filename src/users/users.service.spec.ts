import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import { UsersDao } from '../daos/users.dao'
import { RoomsDao } from '../daos/rooms.dao'

describe('UsersService', () => {
  let service: UsersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersDao,
          useValue: {
            findById: jest.fn(),
            isUsernameTaken: jest.fn(),
            saveCompleteProfile: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: RoomsDao,
          useValue: {
            deleteByOwner: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
