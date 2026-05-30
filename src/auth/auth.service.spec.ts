import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { UsersDao } from '../daos/users.dao'

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersDao,
          useValue: {
            isUsernameTaken: jest.fn(),
            createStub: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
