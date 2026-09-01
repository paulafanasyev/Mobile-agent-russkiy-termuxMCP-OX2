from setuptools import find_namespace_packages, setup

setup(
    name="cli-anything-ox2",
    version="0.1.0",
    description="Agent-native CLI harness for the OX2 Russian Android mobile agent project",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    install_requires=["click>=8.1,<9"],
    extras_require={"test": ["pytest>=8,<9"]},
    entry_points={"console_scripts": ["cli-anything-ox2=cli_anything.ox2.ox2_cli:main"]},
)
